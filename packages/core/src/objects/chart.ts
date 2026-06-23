/**
 * Declarative data charts — `{@chart[type="bar|pie|line|histogram"]: …}`.
 *
 * Like {@plot}, reuses the declarative Plotly path: builds a `{ data, layout }`
 * figure and emits a `htsl-scene` data node, which the runtime draws. No
 * `<script>`, no eval — just data.
 *
 *   {@chart[type="bar", title="Notes"]: {pt[x="Lun", y=12]/} {pt[x="Mar", y=19]/}}
 *   {@chart[type="pie"]: {pt[x="A", y=30]/} {pt[x="B", y=70]/}}
 *   {@chart[type="histogram", values="2,3,3,4,4,4,5", bins=5]/}
 */
import { escapeHtml } from "../escape.js";
import type { ElementNode, ObjectNode } from "../types.js";

export function isChartPath(path: string): boolean {
  return path === "chart";
}

function num(v: string | undefined, fallback: number): number {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** "A" / "12.5" → keep numbers numeric, categories as strings (Plotly accepts both). */
function coord(v: string | undefined): number | string {
  if (v === undefined) return "";
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) ? n : v;
}

const PALETTE = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

export function renderChart(node: ObjectNode, hashAttr: string): string {
  const type = (node.attrs["type"] ?? "bar").toLowerCase();
  const width = num(node.attrs["width"], 480);
  const height = num(node.attrs["height"], 340);
  const title = node.attrs["title"];

  const pts = node.children.filter(
    (c): c is ElementNode => c.type === "element" && c.tag === "pt",
  );

  let data: Record<string, unknown>[];
  let hasAxes = true;

  if (type === "histogram") {
    const values = (node.attrs["values"] ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    const bins = node.attrs["bins"] !== undefined ? num(node.attrs["bins"], 0) : undefined;
    data = [
      {
        type: "histogram",
        x: values,
        marker: { color: PALETTE[0], line: { color: "#fff", width: 1 } },
        ...(bins ? { nbinsx: bins } : {}),
      },
    ];
  } else if (type === "pie") {
    hasAxes = false;
    data = [
      {
        type: "pie",
        labels: pts.map((p) => String(coord(p.attrs["x"]))),
        values: pts.map((p) => num(p.attrs["y"], 0)),
        marker: { colors: pts.map((p, i) => p.attrs["color"] ?? PALETTE[i % PALETTE.length]) },
        textinfo: "label+percent",
      },
    ];
  } else if (type === "line") {
    data = [
      {
        type: "scatter",
        mode: "lines+markers",
        x: pts.map((p) => coord(p.attrs["x"])),
        y: pts.map((p) => num(p.attrs["y"], 0)),
        line: { color: PALETTE[0], width: 2 },
        marker: { color: PALETTE[0], size: 7 },
      },
    ];
  } else {
    // bar (default) — one colour per category for readability.
    data = [
      {
        type: "bar",
        x: pts.map((p) => coord(p.attrs["x"])),
        y: pts.map((p) => num(p.attrs["y"], 0)),
        marker: { color: pts.map((p, i) => p.attrs["color"] ?? PALETTE[i % PALETTE.length]) },
      },
    ];
  }

  const layout: Record<string, unknown> = {
    width,
    height,
    margin: { l: 46, r: 16, t: title ? 36 : 14, b: 40 },
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#ffffff",
    showlegend: false,
    ...(hasAxes
      ? {
          xaxis: { title: node.attrs["xtitle"] ?? "", gridcolor: "#eef2f7" },
          yaxis: { title: node.attrs["ytitle"] ?? "", gridcolor: "#eef2f7", zeroline: true, zerolinecolor: "#94a3b8" },
        }
      : {}),
  };
  if (title) layout["title"] = { text: title, font: { size: 14 } };

  const json = escapeHtml(JSON.stringify({ data, layout }));
  return (
    `<div class="htsl-scene htsl-scene--2d" data-htsl-scene="${json}"${hashAttr} ` +
    `style="width:${width}px;height:${height}px">` +
    `<span class="htsl-scene-fallback">Graphique — Plotly requis.</span></div>`
  );
}
