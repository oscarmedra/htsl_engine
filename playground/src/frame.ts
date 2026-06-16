/**
 * Surgical renderer for the preview iframe.
 *
 * The iframe is created ONCE (KaTeX CSS + base styles in the head). Each update
 * morphs only the changed nodes into the existing body instead of reloading the
 * whole document:
 *
 *  - author `<link>` / `<script src>` (any CSS/JS framework) are hoisted to the
 *    iframe head and reconciled by key, so an unchanged framework is never
 *    reloaded;
 *  - blocks carrying an identical `data-htsl-hash` are kept untouched (no DOM
 *    work, no KaTeX re-render);
 *  - **dynamic nodes are not scripts**: after each morph the engine's single
 *    runtime is asked to {@link purge} removed scenes and {@link hydrate} the
 *    root (it loads Plotly once into the iframe and is idempotent). The renderer
 *    never emits executable `<script>`.
 */
import morphdom from "morphdom";
import { hydrate as htslHydrate, purge as htslPurge, type HtslRuntime } from "@htsl/core";

const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";

/** Dynamic node types: (class, data attribute) preserved across morphs. */
const DYNAMIC: ReadonlyArray<readonly [string, string]> = [
  ["htsl-scene", "data-htsl-scene"],
  ["htsl-three", "data-htsl-three"],
];

/** The iframe window, as the runtime's loadDependency/hydrate expect it. */
type RuntimeWin = Parameters<HtslRuntime["hydrate"]>[1];

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
  /* PDF export (print): A4 page sized for mathematical documents. */
  @media print {
    @page { size: A4; margin: 1.8cm 2cm; }
    body { padding: 0; width: auto; font-size: 11.5pt; line-height: 1.55; }
    h1 { font-size: 1.9em; } h2 { font-size: 1.45em; } h3 { font-size: 1.2em; }
    .htsl-edit, .htsl-hover { background: none !important; box-shadow: none !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    /* Keep formulas, scenes, tables and images from splitting across pages. */
    .htsl-math-equation, .htsl-math-block, .htsl-scene,
    .katex-display, table, img, figure { break-inside: avoid; }
    h1, h2, h3 { break-after: avoid; }
  }
`;

export interface MorphStats {
  touched: number;
  total: number;
}

export class FrameRenderer {
  private doc: Document | null = null;
  private root: HTMLElement | null = null;
  private pending: string | null = null;
  private readonly assets = new Map<string, HTMLElement>();
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
<title>document</title>
<base target="_blank" />
<link rel="stylesheet" href="${KATEX_CSS}" />
<style>${BASE_CSS}${mathCss}</style>
</head><body><div id="htsl-root"></div></body></html>`;
  }

  /** Open the print dialog for the rendered document (→ « Enregistrer au format
   *  PDF »). Prints only the iframe, so the PDF is the pure render. */
  printToPdf(): void {
    const win = this.iframe.contentWindow;
    if (!win || !this.doc) return;
    // Default the PDF filename to the document's first heading.
    const heading = this.doc.querySelector("h1, h2, h3")?.textContent?.trim();
    this.doc.title = heading ? heading.slice(0, 60) : "document";
    win.focus();
    win.print();
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

    const win = this.iframe.contentWindow as unknown as RuntimeWin;
    let touched = 0;
    const removed: Element[] = []; // scenes leaving the DOM → purge their Plotly state
    morphdom(this.root, next, {
      childrenOnly: true,
      onBeforeElUpdated: (from: Element, to: Element) => {
        const fh = from.getAttribute("data-htsl-hash");
        const th = to.getAttribute("data-htsl-hash");
        if (fh !== null && fh === th) return false; // identical block → keep as-is
        // Same dynamic slot (scene→scene, three→three): update only the data and
        // keep the element; the runtime redraws it (Plotly.react / Three rebuild).
        for (const [cls, attr] of DYNAMIC) {
          if (from.classList.contains(cls) && to.classList.contains(cls)) {
            const spec = to.getAttribute(attr);
            if (spec !== null) from.setAttribute(attr, spec);
            if (th !== null) from.setAttribute("data-htsl-hash", th);
            touched += 1;
            return false;
          }
        }
        // A dynamic node repurposed into other content → free its resources first.
        if (from.classList.contains("htsl-scene") || from.classList.contains("htsl-three")) {
          htslPurge([from], win);
        }
        touched += 1;
        return true;
      },
      onNodeAdded: (node: globalThis.Node) => {
        touched += 1;
        return node;
      },
      onNodeDiscarded: (node: globalThis.Node) => {
        touched += 1;
        if (node.nodeType === 1) removed.push(node as Element);
      },
    });

    // Make freshly inserted editable text runs editable in place.
    if (this.onTextEdit) {
      this.root
        .querySelectorAll(".htsl-edit:not([contenteditable])")
        .forEach((el) => el.setAttribute("contenteditable", "plaintext-only"));
    }

    const total = this.root.getElementsByTagName("*").length;

    // Hand off to the engine's single runtime: free removed scenes, then hydrate.
    if (removed.length > 0) htslPurge(removed, win);
    void htslHydrate(this.root, win);

    return { touched, total };
  }

  /* ----------------------------------------------------------------------- */
  /* Block editing (click a rendered element → edit its HTSL source)         */
  /* ----------------------------------------------------------------------- */

  private clearHover(): void {
    this.hovered?.classList.remove("htsl-hover");
    this.hovered = null;
  }

  /** The user-defined **component instance** above `t` (marked with
   *  `data-htsl-component`). Only components are editable from the render — its
   *  `data-htsl-range` points at the component's `{!define …}`. */
  private componentInstance(t: Element | null): HTMLElement | null {
    return (t?.closest("[data-htsl-component]") as HTMLElement | null) ?? null;
  }

  private installBlockEditing(doc: Document): void {
    // Highlight the component instance under the cursor.
    doc.addEventListener("mouseover", (ev) => {
      const el = this.componentInstance(ev.target as Element | null);
      if (el === this.hovered) return;
      this.clearHover();
      this.hovered = el;
      el?.classList.add("htsl-hover");
    });

    // Double-click a component instance → edit its DEFINITION ({!define …}).
    doc.addEventListener("dblclick", (ev) => {
      const el = this.componentInstance(ev.target as Element | null);
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
    // Only external assets are hoisted to <head> (loaded once). Inline scripts
    // stay in the body and are executed by runInlineScripts after morphing.
    fragment.querySelectorAll("link, script[src]").forEach((node) => {
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

}
