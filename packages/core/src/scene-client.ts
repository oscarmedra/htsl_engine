/**
 * Browser-side hydration for geometry scenes.
 *
 * The renderer emits each scene as a `<div class="htsl-scene" data-htsl-scene>`
 * carrying the Plotly spec as JSON. Call `hydrateScenes()` after Plotly has
 * loaded to draw them. It is **preservation-aware**: a scene already drawn whose
 * description is unchanged is left untouched (no `Plotly.newPlot`); if only the
 * data changed it is updated with `Plotly.react`. Safe in Node (no-op).
 */
import type { SceneSpec } from "./objects/geometry.js";

interface PlotlyLike {
  newPlot(el: Element, data: unknown[], layout: unknown, config?: unknown): unknown;
  react?(el: Element, data: unknown[], layout: unknown, config?: unknown): unknown;
}

const CONFIG = { displayModeBar: false, responsive: true };

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
 * Draw / update the geometry scenes under `root`.
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
    if (!raw) return;

    // Stable identity of this scene's description.
    const key = el.getAttribute("data-htsl-hash") ?? quickHash(raw);
    const drawnKey = el.getAttribute("data-htsl-plotted");
    const hasPlot = el.querySelector(".js-plotly-plot") !== null;

    if (drawnKey === key && hasPlot) return; // unchanged → keep the existing plot

    let spec: SceneSpec;
    try {
      spec = JSON.parse(raw) as SceneSpec;
    } catch {
      return;
    }

    if (hasPlot && Plotly.react) {
      Plotly.react(el, spec.data, spec.layout, CONFIG); // data changed → in-place update
    } else {
      el.textContent = "";
      Plotly.newPlot(el, spec.data, spec.layout, CONFIG);
    }
    el.setAttribute("data-htsl-plotted", key);
    drawn += 1;
  });
  return drawn;
}
