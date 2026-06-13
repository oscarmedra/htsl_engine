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

const PALETTE = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#db2777"];

interface Curve {
  fn: string;
  color: string | undefined;
  label: string | undefined;
}

/** Render `{@plot}` as a declarative Plotly scene node — one curve (attr `fn`)
 *  or several (`{@plot.curve}` children, with a legend). */
export function renderPlot(node: ObjectNode, hashAttr: string): string {
  if (node.path !== "math.plot.fn") return "";

  // Gather curves: child `plot.curve` objects, else the single inline `fn`.
  const curves: Curve[] = [];
  for (const child of node.children) {
    if (child.type === "object" && child.path === "math.plot.curve") {
      curves.push({ fn: child.attrs["fn"] ?? "x", color: child.attrs["color"], label: child.attrs["label"] });
    }
  }
  if (curves.length === 0) {
    curves.push({ fn: node.attrs["fn"] ?? "x", color: node.attrs["color"], label: node.attrs["title"] });
  }

  const [x0, x1] = range(node.attrs["xrange"], [-10, 10]);
  const samples = Math.max(2, Math.min(5000, Math.round(num(node.attrs["samples"], 400))));
  const xs: number[] = [];
  for (let i = 0; i < samples; i++) xs.push(x0 + ((x1 - x0) * i) / (samples - 1));

  const data = curves.map((c, i) => {
    const f = safeExpr(c.fn);
    const ys = xs.map((x) => {
      const y = f({ x });
      return Number.isFinite(y) ? y : null; // gaps at asymptotes / undefined
    });
    return {
      type: "scatter",
      mode: "lines",
      x: xs,
      y: ys,
      name: c.label ?? c.fn,
      line: { color: c.color ?? PALETTE[i % PALETTE.length], width: 2 },
      connectgaps: false,
    };
  });

  const width = num(node.attrs["width"], 640);
  const height = num(node.attrs["height"], 360);
  const title = node.attrs["title"];
  const showlegend = curves.length > 1;

  const layout: Record<string, unknown> = {
    width,
    height,
    margin: { l: 44, r: 16, t: title ? 34 : 12, b: 36 },
    xaxis: { zeroline: true, zerolinecolor: "#94a3b8", gridcolor: "#eef2f7" },
    yaxis: { zeroline: true, zerolinecolor: "#94a3b8", gridcolor: "#eef2f7" },
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
    showlegend,
    ...(showlegend ? { legend: { x: 1, xanchor: "right", y: 1 } } : {}),
  };
  if (title) layout["title"] = { text: title, font: { size: 14 } };

  const spec = { data, layout };
  const json = escapeHtml(JSON.stringify(spec));
  return (
    `<div class="htsl-scene htsl-scene--2d" data-htsl-scene="${json}"${hashAttr} ` +
    `style="width:${width}px;height:${height}px">` +
    `<span class="htsl-scene-fallback">Graphe de fonction — Plotly requis.</span></div>`
  );
}
