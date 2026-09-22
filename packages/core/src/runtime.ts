/**
 * HTSL browser runtime — the single, idempotent layer that brings declarative
 * HTSL output to life.
 *
 * The renderer never emits executable `<script>`: every dynamic thing is a data
 * node (`class="htsl-<type>" data-htsl-<type>="…"`). This runtime scans those
 * nodes, loads each type's external dependency **once** (cached Promise, no
 * races), and initialises them. It is the only JavaScript the engine runs.
 *
 * Usage
 * -----
 *  - Embedded (e.g. the playground) imports {@link hydrate} / {@link purge} and
 *    calls them after each DOM update, targeting a specific window (the preview
 *    iframe). The runtime operates on that window's document and loads deps into
 *    it.
 *  - Standalone pages call {@link installHtslRuntime} (or load a build that does
 *    so): it exposes the single global `window.HTSL`, hydrates on
 *    `DOMContentLoaded`, and keeps things in sync with a `MutationObserver`.
 *
 * No globals are created beyond `window.HTSL`.
 */
import { hydrateScenes, pendingScenes, purgeScenes, type PlotlyLike } from "./scene-client.js";
import { hydrateThree, pendingThree, purgeThree, type ThreeNS } from "./three-client.js";
import { hydrateSlides, purgeSlides } from "./slides-client.js";
import { hydrateBooks } from "./book-client.js";
import { hydrateTabs, purgeTabs } from "./tabs-client.js";
import { hydrateQuiz, purgeQuiz } from "./quiz-client.js";
import { hydrateParams, purgeParams } from "./param-client.js";

/** External dependency of a dynamic type. KaTeX (formulas) will join later. */
const PLOTLY_URL = "https://cdn.plot.ly/plotly-2.27.0.min.js";
const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const ORBIT_URL = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js";

/** Minimal view of the target window we touch (the page's, or an iframe's). */
interface RuntimeWindow {
  document: Document;
  Plotly?: PlotlyLike;
  THREE?: ThreeNS;
  HTSL?: HtslRuntime;
  MutationObserver?: typeof MutationObserver;
  requestAnimationFrame?: (cb: (t: number) => void) => number;
  cancelAnimationFrame?: (id: number) => void;
  addEventListener?: (type: string, cb: (e: Event) => void) => void;
  getComputedStyle?: (el: Element) => CSSStyleDeclaration;
  setTimeout?: (fn: () => void, ms: number) => number;
  focus?: () => void;
  print?: () => void;
  __htslDeps?: Map<string, Promise<void>>;
  __htslPrintWired?: boolean;
  __htslDocDeferred?: boolean;
}

export interface HtslRuntime {
  loadDependency(url: string, win?: RuntimeWindow): Promise<void>;
  hydrate(root: ParentNode, win?: RuntimeWindow): Promise<number>;
  purge(removed: Iterable<Element>, win?: RuntimeWindow): void;
}

function targetWindow(win?: RuntimeWindow): RuntimeWindow | undefined {
  if (win) return win;
  const g = globalThis as unknown as { window?: RuntimeWindow };
  return g.window;
}

/**
 * Flag `{@page}` elements whose content is taller than one sheet — they will spill
 * onto the next printed page. On screen a page's `min-height` equals one sheet, so
 * an `offsetHeight` beyond it means the content overflowed. Adds a class the CSS
 * turns into a small red warning; purely informative, never blocks rendering.
 */
/**
 * Fit each paged document to the pane by zooming it down when its true sheet width
 * exceeds the available width. Pages are laid out at their real size (so content
 * wraps exactly as in print and h-full/flex layouts are correct); `zoom` scales the
 * whole document uniformly — no reflow, no distortion. Reset to 1 for print by CSS.
 */
function markDocZoom(w: RuntimeWindow): void {
  const gcs = w.getComputedStyle;
  if (typeof gcs !== "function") return;
  const viewportH = w.document.documentElement?.clientHeight || 0;
  const docs = w.document.querySelectorAll<HTMLElement>(".htsl-doc");
  docs.forEach((doc) => {
    doc.style.setProperty("--htsl-zoom", "1"); // measure natural size first
    // In book mode only the current page is visible; measure it (not a hidden one).
    const book = doc.classList.contains("htsl-doc--book");
    const page =
      (book && doc.querySelector<HTMLElement>(".htsl-doc-page.is-current")) ||
      doc.querySelector<HTMLElement>(".htsl-doc-page");
    if (!page) return;
    const cs = gcs.call(w, doc);
    const padX = parseFloat(cs.paddingLeft || "0") + parseFloat(cs.paddingRight || "0");
    const naturalW = page.getBoundingClientRect().width + padX;
    const availW = (doc.parentElement ?? doc).clientWidth;
    let k = naturalW > availW && naturalW > 0 ? availW / naturalW : 1;
    // Book mode = one leaf at a time → also fit the height, so the WHOLE sheet is
    // visible at once (a real book/slide view; nothing runs off the bottom).
    if (book && viewportH > 0) {
      const naturalH = doc.scrollHeight; // current page + nav + padding, unzoomed
      if (naturalH > 0) k = Math.min(k, viewportH / naturalH);
    }
    k = Math.max(0.1, Math.min(1, k));
    doc.style.setProperty("--htsl-zoom", String(Math.round(k * 1000) / 1000));
  });
}

/** Recompute zoom-to-fit then overflow flags (order matters: zoom first). */
function recalcDocs(w: RuntimeWindow): void {
  markDocZoom(w);
  markPageOverflow(w);
}

/** External stylesheets (e.g. a Tailwind CDN) apply after the first render and change
 *  page heights, so re-run the doc measurements once things have settled. Wired once. */
function scheduleDeferredRecalc(w: RuntimeWindow): void {
  if (w.__htslDocDeferred || w.document.querySelector(".htsl-doc") === null) return;
  w.__htslDocDeferred = true;
  const run = (): void => recalcDocs(w);
  w.addEventListener?.("load", run);
  w.setTimeout?.(run, 500);
  w.setTimeout?.(run, 1600);
}

function markPageOverflow(w: RuntimeWindow): void {
  const gcs = w.getComputedStyle;
  if (typeof gcs !== "function") return;
  const pages = w.document.querySelectorAll<HTMLElement>(".htsl-doc-page");
  pages.forEach((p) => {
    // Expected sheet height at the current width, from the format's aspect ratio
    // (works whatever the format or the on-screen scaling). A taller box overflows.
    const ar = gcs.call(w, p).getPropertyValue("--htsl-doc-ar").split("/");
    const wn = parseFloat(ar[0] ?? ""),
      hn = parseFloat(ar[1] ?? "");
    const expected = wn > 0 && hn > 0 ? p.offsetWidth * (hn / wn) : 0;
    const overflow = expected > 0 && p.offsetHeight > expected + 2;
    p.classList.toggle("htsl-doc-page--overflow", overflow);
  });
}

/**
 * Reveal collapsed content for printing / PDF export. Interactive components use
 * native `<details>` (guided steps, exercise solutions, {@reveal}…): when closed
 * their body is hidden by the browser and would be MISSING from the PDF. Before
 * printing we force every closed `<details>` open, and restore them afterwards.
 * Wired once per window; safe in an iframe (the frame's own print events fire).
 */
function wirePrint(w: RuntimeWindow): void {
  if (w.__htslPrintWired || typeof w.addEventListener !== "function") return;
  w.__htslPrintWired = true;
  const opened = new Set<Element>();
  w.addEventListener("beforeprint", () => {
    opened.clear();
    w.document.querySelectorAll("details:not([open])").forEach((d) => {
      d.setAttribute("open", "");
      opened.add(d);
    });
  });
  w.addEventListener("afterprint", () => {
    opened.forEach((d) => {
      if (d.isConnected) d.removeAttribute("open");
    });
    opened.clear();
  });

  // "Download as PDF" button inside {@document}: print only the document, giving
  // a real vector PDF via the browser's "Save as PDF" (no silent write exists).
  w.addEventListener("click", (e) => {
    const btn = (e.target as Element | null)?.closest?.("[data-htsl-pdf]");
    if (!btn) return;
    const doc = btn.closest(".htsl-doc");
    const heading = doc?.querySelector("h1, h2, h3")?.textContent?.trim();
    if (heading) w.document.title = heading.slice(0, 60);
    w.focus?.();
    w.print?.();
  });
}

/**
 * Load an external script **once per (window, url)**. The Promise is cached on
 * the target window, so concurrent callers share one load and never race; a
 * reloaded iframe (fresh window) starts clean.
 */
export function loadDependency(url: string, win?: RuntimeWindow): Promise<void> {
  const w = targetWindow(win);
  if (!w?.document) return Promise.reject(new Error("HTSL: aucune fenêtre cible."));
  const cache = (w.__htslDeps ??= new Map<string, Promise<void>>());
  const hit = cache.get(url);
  if (hit) return hit;

  const p = new Promise<void>((resolve, reject) => {
    const existing = w.document.querySelector(`script[data-htsl-dep="${url}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = w.document.createElement("script");
    s.src = url;
    s.async = true;
    s.setAttribute("data-htsl-dep", url);
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error(`HTSL: échec du chargement de ${url}.`)));
    w.document.head.appendChild(s);
  });
  cache.set(url, p);
  return p;
}

/**
 * Initialise every dynamic node under `root` that needs it. Idempotent: nodes
 * already up to date are skipped (strictly nothing), changed scenes are updated
 * with `Plotly.react`. Dependencies are loaded only when there is work to do.
 */
export async function hydrate(root: ParentNode, win?: RuntimeWindow): Promise<number> {
  const w = targetWindow(win);
  if (!w?.document) return 0;

  wirePrint(w);
  recalcDocs(w);
  scheduleDeferredRecalc(w);

  let drawn = 0;

  // Slide decks + tabs (pure DOM, no external dependency → always hydrated, cheap).
  drawn += hydrateSlides(root, w);
  drawn += hydrateBooks(root, w);
  drawn += hydrateTabs(root, w);
  drawn += hydrateQuiz(root, w);
  drawn += hydrateParams(root, w);

  // Scenes (Plotly).
  if (pendingScenes(root).length > 0) {
    try {
      await loadDependency(PLOTLY_URL, w);
      drawn += hydrateScenes(root, w.Plotly);
    } catch {
      /* CDN unreachable → leave the fallback message */
    }
  }

  // Animated 3D scenes (Three.js).
  const three = pendingThree(root);
  if (three.length > 0 && w.requestAnimationFrame && w.cancelAnimationFrame) {
    try {
      await loadDependency(THREE_URL, w);
      // Load mouse-orbit controls only if a scene asks for them.
      if (three.some((el) => (el.getAttribute("data-htsl-three") ?? "").includes('"controls":true'))) {
        await loadDependency(ORBIT_URL, w).catch(() => undefined);
      }
      drawn += hydrateThree(root, {
        THREE: w.THREE,
        document: w.document,
        requestAnimationFrame: w.requestAnimationFrame.bind(w),
        cancelAnimationFrame: w.cancelAnimationFrame.bind(w),
      });
    } catch {
      /* CDN unreachable → leave the fallback message */
    }
  }

  return drawn;
}

/** Free resources of removed/replaced dynamic nodes (avoids memory leaks). */
export function purge(removed: Iterable<Element>, win?: RuntimeWindow): void {
  const w = targetWindow(win);
  purgeScenes(removed, w?.Plotly);
  purgeThree(removed);
  purgeSlides();
  purgeTabs();
  purgeQuiz();
  purgeParams();
}

/**
 * Install the runtime on a window as the single global `window.HTSL`, hydrate on
 * load, and keep in sync via a `MutationObserver` (purges removed scenes, then
 * re-hydrates). Safe to call repeatedly — installs once per window.
 */
export function installHtslRuntime(win?: RuntimeWindow): HtslRuntime | undefined {
  const w = targetWindow(win);
  if (!w?.document) return undefined;
  if (w.HTSL) return w.HTSL; // already installed → single namespace

  const runtime: HtslRuntime = { loadDependency, hydrate, purge };
  w.HTSL = runtime;

  const root = w.document.documentElement;
  const run = (): void => {
    void hydrate(w.document, w);
  };
  if (w.document.readyState === "loading") {
    w.document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  if (typeof w.MutationObserver !== "undefined") {
    const mo = new w.MutationObserver((mutations) => {
      const removed: Element[] = [];
      for (const m of mutations) {
        m.removedNodes.forEach((n) => {
          if (n.nodeType === 1) removed.push(n as Element);
        });
      }
      if (removed.length > 0) purge(removed, w);
      void hydrate(w.document, w);
    });
    mo.observe(root, { childList: true, subtree: true });
  }

  return runtime;
}
