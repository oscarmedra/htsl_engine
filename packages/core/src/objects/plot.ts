/**
 * Declarative 2D function plot `y = f(x)` — `{@plot[fn="sin(x)/x", …]}`.
 *
 * Reuses the existing **declarative Plotly path**: it samples the function with
 * the safe expression evaluator and emits a `htsl-scene` data node, which the
 * runtime draws/updates exactly like a geometry scene. No `<script>`, no eval.
 */
import { escapeHtml } from "../escape.js";
import { safeExpr } from "./expr.js";
import type { ObjectNode } from "../types.js";

export function isPlotPath(path: string): boolean {
  return path.startsWith("math.plot.");
}

function num(v: string | undefined, fallback: number): number {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function range(v: string | undefined, fallback: [number, number]): [number, number] {
  if (!v) return fallback;
  const p = v.replace(/[()]/g, "").split(",").map((s) => Number(s.trim()));
  return [Number.isFinite(p[0]) ? p[0]! : fallback[0], Number.isFinite(p[1]) ? p[1]! : fallback[1]];
}

/** Render `{@plot[fn=…]}` as a declarative Plotly scene node (sampled curve). */
export function renderPlot(node: ObjectNode, hashAttr: string): string {
  if (node.path !== "math.plot.fn") return "";
  const f = safeExpr(node.attrs["fn"] ?? "x");
  const [x0, x1] = range(node.attrs["xrange"], [-10, 10]);
  const samples = Math.max(2, Math.min(5000, Math.round(num(node.attrs["samples"], 400))));
  const xs: number[] = [];
  const ys: Array<number | null> = [];
  for (let i = 0; i < samples; i++) {
    const x = x0 + ((x1 - x0) * i) / (samples - 1);
    const y = f({ x });
    xs.push(x);
    ys.push(Number.isFinite(y) ? y : null); // gaps for asymptotes / undefined
  }

  const color = node.attrs["color"] ?? "#2563eb";
  const width = num(node.attrs["width"], 640);
  const height = num(node.attrs["height"], 360);
  const title = node.attrs["title"];

  const layout: Record<string, unknown> = {
    width,
    height,
    margin: { l: 44, r: 16, t: title ? 34 : 12, b: 36 },
    xaxis: { zeroline: true, zerolinecolor: "#94a3b8", gridcolor: "#eef2f7" },
    yaxis: { zeroline: true, zerolinecolor: "#94a3b8", gridcolor: "#eef2f7" },
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
  };
  if (title) layout["title"] = { text: title, font: { size: 14 } };

  const spec = {
    data: [{ type: "scatter", mode: "lines", x: xs, y: ys, line: { color, width: 2 }, connectgaps: false }],
    layout,
  };
  const json = escapeHtml(JSON.stringify(spec));
  return (
    `<div class="htsl-scene htsl-scene--2d" data-htsl-scene="${json}"${hashAttr} ` +
    `style="width:${width}px;height:${height}px">` +
    `<span class="htsl-scene-fallback">Graphe de fonction — Plotly requis.</span></div>`
  );
}
