/**
 * Browser-side **drawing** for geometry scenes (low level; the {@link "./runtime"}
 * runtime is the high-level, dependency-aware entry point most callers use).
 *
 * The renderer emits each scene as a declarative
 * `<div class="htsl-scene" data-htsl-scene='{json}' data-htsl-hash="…">` node —
 * never a `<script>`. Given a Plotly instance, these helpers draw, update or
 * purge those nodes:
 *
 *  - a scene already drawn whose hash is unchanged is left untouched (nothing);
 *  - a scene whose hash changed is updated in place with `Plotly.react`
 *    (never destroy + `newPlot`);
 *  - a removed scene is `Plotly.purge`d to free its WebGL/DOM resources.
 *
 * Each drawn node is stamped `data-htsl-init="<hash>"`; re-calling is idempotent.
 * Safe in Node (no Plotly → no-op).
 */
import type { SceneSpec } from "./objects/geometry.js";

export interface PlotlyLike {
  newPlot(el: Element, data: unknown[], layout: unknown, config?: unknown): unknown;
  react?(el: Element, data: unknown[], layout: unknown, config?: unknown): unknown;
  purge?(el: Element): unknown;
}

const CONFIG = { displayModeBar: false, responsive: true };

/** Stable identity of a scene's description (the block hash, else a content hash). */
function sceneKey(el: Element): string {
  return el.getAttribute("data-htsl-hash") ?? quickHash(el.getAttribute("data-htsl-scene") ?? "");
}

/** True once Plotly has drawn into `el`. Plotly stamps `js-plotly-plot` on the
 *  target element itself (not a descendant); a child marker covers test fakes. */
function hasPlot(el: Element): boolean {
  return el.classList?.contains("js-plotly-plot") || el.querySelector(".js-plotly-plot") !== null;
}

/** A scene needs (re)drawing when it has never been drawn or its hash changed. */
function isPending(el: Element): boolean {
  return !(el.getAttribute("data-htsl-init") === sceneKey(el) && hasPlot(el));
}

/** Scenes under `root` that still need to be drawn or updated (no Plotly needed). */
export function pendingScenes(root: ParentNode): Element[] {
  const out: Element[] = [];
  root.querySelectorAll(".htsl-scene[data-htsl-scene]").forEach((el) => {
    if (isPending(el)) out.push(el);
  });
  return out;
}

/** Small string hash so we can tell scenes apart without a full deep compare. */
function quickHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Draw / update the geometry scenes under `root` with the given Plotly.
 * @returns the number of scenes actually (re)drawn (unchanged ones are skipped).
 */
export function hydrateScenes(root?: ParentNode, plotly?: PlotlyLike): number {
  const scope = root ?? (typeof document !== "undefined" ? document : undefined);
  if (!scope) return 0;
  const Plotly = plotly ?? (globalThis as { Plotly?: PlotlyLike }).Plotly;
  if (!Plotly) return 0;

  let drawn = 0;
  scope.querySelectorAll(".htsl-scene[data-htsl-scene]").forEach((el) => {
    const raw = el.getAttribute("data-htsl-scene");
    if (!raw || !isPending(el)) return; // missing data, or unchanged → nothing

    let spec: SceneSpec;
    try {
      spec = JSON.parse(raw) as SceneSpec;
    } catch {
      return;
    }

    if (hasPlot(el) && Plotly.react) {
      Plotly.react(el, spec.data, spec.layout, CONFIG); // hash changed → in-place update
    } else {
      el.textContent = "";
      Plotly.newPlot(el, spec.data, spec.layout, CONFIG);
    }
    el.setAttribute("data-htsl-init", sceneKey(el));
    drawn += 1;
  });
  return drawn;
}

/**
 * Free Plotly resources for scenes being removed/replaced (call before they leave
 * the DOM). `removed` may be scene nodes or any nodes that contain scenes.
 */
export function purgeScenes(removed: Iterable<Element>, plotly?: PlotlyLike): void {
  const Plotly = plotly ?? (globalThis as { Plotly?: PlotlyLike }).Plotly;
  if (!Plotly?.purge) return;
  const purge = (el: Element): void => {
    if (el.getAttribute?.("data-htsl-init") !== null && el.classList?.contains("htsl-scene")) {
      try {
        Plotly.purge!(el);
      } catch {
        /* detached / never plotted — ignore */
      }
    }
  };
  for (const el of removed) {
    if (el.classList?.contains("htsl-scene")) purge(el);
    el.querySelectorAll?.(".htsl-scene").forEach(purge);
  }
}
