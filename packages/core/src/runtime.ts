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
import { hydrateTabs, purgeTabs } from "./tabs-client.js";
import { hydrateQuiz, purgeQuiz } from "./quiz-client.js";

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
  __htslDeps?: Map<string, Promise<void>>;
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

  let drawn = 0;

  // Slide decks + tabs (pure DOM, no external dependency → always hydrated, cheap).
  drawn += hydrateSlides(root, w);
  drawn += hydrateTabs(root, w);
  drawn += hydrateQuiz(root, w);

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
