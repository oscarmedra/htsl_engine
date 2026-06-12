/**
 * Surgical renderer for the preview iframe.
 *
 * The iframe is created ONCE (KaTeX CSS + base styles in the head). Each update
 * morphs only the changed nodes into the existing body instead of reloading the
 * whole document:
 *
 *  - `<link>` / `<script>` (any CSS/JS framework) are hoisted to the iframe head
 *    and reconciled by key, so an unchanged framework is never reloaded;
 *  - blocks carrying an identical `data-htsl-hash` are kept untouched (no DOM
 *    work, no KaTeX re-render);
 *  - geometry scenes are never re-plotted unless their description changed
 *    (`hydrateScenes` uses `Plotly.react`).
 */
import morphdom from "morphdom";
import { hydrateScenes } from "htsl";

const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
const PLOTLY_JS = "https://cdn.plot.ly/plotly-2.27.0.min.js";

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body { font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f2430; margin: 0; padding: 1rem 1.1rem; }
  h1 { font-size: 1.6rem; } h2 { font-size: 1.25rem; }
  /* Inline text editing (single text runs). */
  .htsl-edit { border-radius: 3px; transition: background 0.1s, box-shadow 0.1s; }
  .htsl-edit:hover { background: #eef2ff; box-shadow: 0 0 0 1px #c7d2fe; cursor: text; }
  .htsl-edit:focus { outline: none; background: #fff8e1; box-shadow: 0 0 0 2px #f59e0b; }
  /* Block editing: the hovered element (its non-text region) is highlighted and
     clickable; clicking opens a full HTSL editor over it (handled by the parent). */
  .htsl-hover { box-shadow: 0 0 0 2px #93c5fd; border-radius: 4px; cursor: pointer; }
`;

export interface MorphStats {
  touched: number;
  total: number;
}

interface PlotlyWin extends Window {
  Plotly?: Parameters<typeof hydrateScenes>[1];
}

export class FrameRenderer {
  private doc: Document | null = null;
  private root: HTMLElement | null = null;
  private pending: string | null = null;
  private readonly assets = new Map<string, HTMLElement>();
  private plotlyLoading = false;
  /** Element currently highlighted on hover (block-edit affordance). */
  private hovered: HTMLElement | null = null;

  constructor(
    private readonly iframe: HTMLIFrameElement,
    mathCss: string,
    private readonly onTextEdit?: (start: number, end: number, text: string) => void,
    /** Click on a block → request the parent to open a full editor over it.
     *  `rect` is the element's bounding box in the iframe's own viewport. */
    private readonly onBlockClick?: (start: number, end: number, rect: DOMRect) => void,
  ) {
    this.iframe.addEventListener("load", () => {
      this.doc = this.iframe.contentDocument;
      this.root = this.doc?.getElementById("htsl-root") ?? null;
      // Delegated: when an editable text run loses focus, write it back.
      this.doc?.addEventListener("focusout", (ev) => {
        // Cross-realm: `instanceof Element` fails across the iframe boundary, so
        // duck-type the target instead.
        const t = ev.target as Element | null;
        if (!t || !t.classList?.contains("htsl-edit")) return;
        const span = t.getAttribute("data-htsl-text");
        if (!span || !this.onTextEdit) return;
        const [s, e] = span.split("-").map(Number);
        if (s === undefined || e === undefined) return;
        this.onTextEdit(s, e, t.textContent ?? "");
      });
      // Block editing: highlight the hovered element, click to edit its source.
      if (this.onBlockClick) this.installBlockEditing(this.doc!);
      if (this.pending !== null) {
        const html = this.pending;
        this.pending = null;
        this.apply(html);
      }
    });
    this.iframe.srcdoc = `<!doctype html><html lang="fr"><head>
<meta charset="utf-8" />
<base target="_blank" />
<link rel="stylesheet" href="${KATEX_CSS}" />
<style>${BASE_CSS}${mathCss}</style>
</head><body><div id="htsl-root"></div></body></html>`;
  }

  /** Apply a freshly compiled HTML string, morphing only what changed. */
  apply(html: string): MorphStats {
    // Drop any stale hover highlight so morphdom doesn't diff the extra class.
    this.clearHover();
    if (!this.doc || !this.root) {
      this.pending = html; // iframe not loaded yet
      return { touched: 0, total: 0 };
    }
    const doc = this.doc;

    // Parse the new HTML inside the iframe document.
    const tpl = doc.createElement("template");
    tpl.innerHTML = html;

    // Hoist <link>/<script> to the head (frameworks), reconciled by key.
    this.reconcileAssets(tpl.content);

    // Morph the remaining visible content into the existing root.
    const next = doc.createElement("div");
    next.append(...Array.from(tpl.content.childNodes));

    let touched = 0;
    morphdom(this.root, next, {
      childrenOnly: true,
      onBeforeElUpdated: (from: Element, to: Element) => {
        const fh = from.getAttribute("data-htsl-hash");
        const th = to.getAttribute("data-htsl-hash");
        if (fh !== null && fh === th) return false; // identical block → keep as-is
        if (from.classList.contains("htsl-scene")) {
          // Update only the data attributes; leave the plot for hydrateScenes.
          const spec = to.getAttribute("data-htsl-scene");
          if (spec !== null) from.setAttribute("data-htsl-scene", spec);
          if (th !== null) from.setAttribute("data-htsl-hash", th);
          touched += 1;
          return false;
        }
        touched += 1;
        return true;
      },
      onNodeAdded: (node: globalThis.Node) => {
        touched += 1;
        return node;
      },
      onNodeDiscarded: () => {
        touched += 1;
      },
    });

    // Make freshly inserted editable text runs editable in place.
    if (this.onTextEdit) {
      this.root
        .querySelectorAll(".htsl-edit:not([contenteditable])")
        .forEach((el) => el.setAttribute("contenteditable", "plaintext-only"));
    }

    const total = this.root.getElementsByTagName("*").length;
    this.hydrate();
    return { touched, total };
  }

  /* ----------------------------------------------------------------------- */
  /* Block editing (click a rendered element → edit its HTSL source)         */
  /* ----------------------------------------------------------------------- */

  private clearHover(): void {
    this.hovered?.classList.remove("htsl-hover");
    this.hovered = null;
  }

  private installBlockEditing(doc: Document): void {
    // Highlight the innermost editable element under the cursor, but never over
    // a text run (those have their own inline text editing).
    doc.addEventListener("mouseover", (ev) => {
      const t = ev.target as Element | null;
      const el =
        t && !t.closest(".htsl-edit")
          ? (t.closest("[data-htsl-range]") as HTMLElement | null)
          : null;
      if (el === this.hovered) return;
      this.clearHover();
      this.hovered = el;
      el?.classList.add("htsl-hover");
    });

    doc.addEventListener("click", (ev) => {
      const t = ev.target as Element | null;
      if (!t || t.closest(".htsl-edit")) return; // text runs handle their own editing
      const el = t.closest("[data-htsl-range]") as HTMLElement | null;
      if (!el || !this.onBlockClick) return;
      const [s, e] = (el.getAttribute("data-htsl-range") ?? "").split("-").map(Number);
      if (s === undefined || e === undefined) return;
      this.clearHover();
      this.onBlockClick(s, e, el.getBoundingClientRect());
    });
  }

  /** Hoist & reconcile <link>/<script> from the content into the iframe head. */
  private reconcileAssets(fragment: DocumentFragment): void {
    const doc = this.doc!;
    const desired = new Map<string, Element>();
    fragment.querySelectorAll("link, script").forEach((node) => {
      const key =
        node.tagName +
        "|" +
        (node.getAttribute("href") ?? "") +
        "|" +
        (node.getAttribute("src") ?? "") +
        "|" +
        (node.textContent ?? "");
      desired.set(key, node);
      node.remove();
    });

    for (const [key, el] of this.assets) {
      if (!desired.has(key)) {
        el.remove();
        this.assets.delete(key);
      }
    }
    for (const [key, node] of desired) {
      if (this.assets.has(key)) continue;
      const el = doc.createElement(node.tagName.toLowerCase());
      for (const attr of Array.from(node.attributes)) el.setAttribute(attr.name, attr.value);
      if (node.textContent) el.textContent = node.textContent;
      doc.head.appendChild(el);
      this.assets.set(key, el);
    }
  }

  /** Draw / update geometry scenes (loads Plotly into the iframe on demand). */
  private hydrate(): void {
    const doc = this.doc!;
    if (!doc.querySelector(".htsl-scene")) return;
    const win = this.iframe.contentWindow as PlotlyWin | null;
    if (!win) return;

    if (win.Plotly) {
      hydrateScenes(doc, win.Plotly);
      return;
    }
    if (this.plotlyLoading) return;
    this.plotlyLoading = true;
    const s = doc.createElement("script");
    s.src = PLOTLY_JS;
    s.addEventListener("load", () => {
      this.plotlyLoading = false;
      if (win.Plotly) hydrateScenes(doc, win.Plotly);
    });
    doc.head.appendChild(s);
  }
}
