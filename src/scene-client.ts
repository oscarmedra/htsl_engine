/**
 * Browser-side hydration for geometry scenes.
 *
 * The renderer emits each scene as a `<div class="htsl-scene" data-htsl-scene>`
 * carrying the Plotly spec as JSON. Call `hydrateScenes()` once in the page
 * (after Plotly has loaded) to draw them. Without Plotly the fallback message
 * in each div is left untouched. Safe to call in Node (no-op without a DOM).
 */
import type { SceneSpec } from "./objects/geometry.js";

interface PlotlyLike {
  newPlot(el: Element, data: unknown[], layout: unknown, config?: unknown): unknown;
}

export function hydrateScenes(root?: ParentNode, plotly?: PlotlyLike): number {
  const scope = root ?? (typeof document !== "undefined" ? document : undefined);
  if (!scope) return 0;
  const Plotly = plotly ?? (globalThis as { Plotly?: PlotlyLike }).Plotly;
  if (!Plotly) return 0;

  let count = 0;
  scope.querySelectorAll(".htsl-scene[data-htsl-scene]").forEach((el) => {
    const raw = el.getAttribute("data-htsl-scene");
    if (!raw) return;
    let spec: SceneSpec;
    try {
      spec = JSON.parse(raw) as SceneSpec;
    } catch {
      return;
    }
    el.textContent = "";
    Plotly.newPlot(el, spec.data, spec.layout, {
      displayModeBar: false,
      responsive: true,
    });
    count += 1;
  });
  return count;
}
