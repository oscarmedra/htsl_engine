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

  constructor(
    private readonly iframe: HTMLIFrameElement,
    mathCss: string,
  ) {
    this.iframe.addEventListener("load", () => {
      this.doc = this.iframe.contentDocument;
      this.root = this.doc?.getElementById("htsl-root") ?? null;
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

    const total = this.root.getElementsByTagName("*").length;
    this.hydrate();
    return { touched, total };
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
