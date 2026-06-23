/**
 * Interactive-parameter runtime: moving a `{@param}` slider re-samples every
 * `{@plot}` whose `fn` uses that parameter, live (`Plotly.restyle`).
 *
 * Pure DOM + the safe expression interpreter (`compileExpr`, no `eval`). Current
 * values live in `window.__htslParams` (morph-safe enough — re-read on hydrate).
 * The global `input` listener is installed once per window.
 */
import { compileExpr } from "./objects/expr.js";
import type { PlotlyLike } from "./scene-client.js";

interface ParamWindow {
  document: Document;
  __htslParamsWired?: boolean;
  __htslParams?: Record<string, number>;
  Plotly?: PlotlyLike;
}

function paramWin(win?: ParamWindow): ParamWindow | undefined {
  return win ?? (globalThis as unknown as { window?: ParamWindow }).window;
}

/** Re-sample one interactive plot (data-htsl-fn) with the current parameters. */
function resamplePlot(el: HTMLElement, params: Record<string, number>, Plotly: PlotlyLike): void {
  const fn = el.getAttribute("data-htsl-fn");
  if (!fn) return;
  const rng = (el.getAttribute("data-htsl-xrange") ?? "-10,10").split(",").map(Number);
  const x0 = rng[0] ?? -10;
  const x1 = rng[1] ?? 10;
  const samples = Math.max(2, Math.min(5000, Number(el.getAttribute("data-htsl-samples") ?? 400)));
  let f: (s: Record<string, number>) => number;
  try {
    f = compileExpr(fn);
  } catch {
    return;
  }
  const ys: (number | null)[] = [];
  for (let i = 0; i < samples; i++) {
    const x = x0 + ((x1 - x0) * i) / (samples - 1);
    const y = f({ x, ...params });
    ys.push(Number.isFinite(y) ? y : null);
  }
  try {
    Plotly.restyle?.(el, { y: [ys] }, [0]);
  } catch {
    /* plot not drawn yet / Plotly busy → ignore */
  }
}

function plotsUsing(doc: Document, name: string): HTMLElement[] {
  return Array.from(doc.querySelectorAll<HTMLElement>("[data-htsl-fn][data-htsl-params]")).filter((el) =>
    (el.getAttribute("data-htsl-params") ?? "").split(",").includes(name),
  );
}

function wireOnce(win: ParamWindow): void {
  if (win.__htslParamsWired) return;
  win.__htslParamsWired = true;
  win.document.addEventListener("input", (e) => {
    const input = e.target as HTMLInputElement | null;
    if (!input?.classList?.contains("htsl-param-range")) return;
    const name = input.getAttribute("data-htsl-param-name");
    if (!name) return;
    const value = Number(input.value);
    const params = (win.__htslParams ??= {});
    params[name] = value;
    // Update the "name = value" label(s).
    win.document
      .querySelectorAll(`[data-htsl-param-value="${CSS.escape(name)}"]`)
      .forEach((s) => (s.textContent = String(value)));
    if (win.Plotly) for (const el of plotsUsing(win.document, name)) resamplePlot(el, params, win.Plotly);
  });
}

/** Hydrate parameters: seed current values from the sliders, wire the listener. */
export function hydrateParams(root?: ParentNode, win?: ParamWindow): number {
  const w = paramWin(win);
  const scope = root ?? w?.document;
  if (!w || !scope) return 0;
  wireOnce(w);
  const params = (w.__htslParams ??= {});
  let count = 0;
  scope.querySelectorAll<HTMLInputElement>(".htsl-param-range[data-htsl-param-name]").forEach((input) => {
    const name = input.getAttribute("data-htsl-param-name");
    if (name) params[name] = Number(input.value);
    count += 1;
  });
  return count;
}

/** Parameters are pure DOM (+ a values registry); nothing external to free. */
export function purgeParams(): void {
  /* no-op — kept for API symmetry */
}
