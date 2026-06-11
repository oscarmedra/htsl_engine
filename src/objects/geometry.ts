/**
 * Geometry layer.
 *
 * Each geometric object yields Plotly traces via {@link toPlotly}; a `scene`
 * container assembles its children's traces plus a layout into a pure-JSON
 * description ({@link sceneSpec}). The core never depends on Plotly.
 *
 * Context rule: a geometric object *inside* a scene becomes a Plotly trace;
 * *outside* a scene it falls back to its LaTeX notation ({@link latexOfGeometry}).
 */
import type { ObjectNode } from "../types.js";

export type Trace = Record<string, unknown>;
export interface SceneSpec {
  data: Trace[];
  layout: Record<string, unknown>;
}

type Attrs = Record<string, string>;

/* -------------------------------------------------------------------------- */
/* Value helpers                                                              */
/* -------------------------------------------------------------------------- */

function num(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Parse a tuple like "(2,-1,3)" into a number array. */
function vec(value: string | undefined, fallback: number[] = [0, 0, 0]): number[] {
  if (value === undefined) return fallback;
  const parts = value
    .replace(/[()[\]\s]/g, "")
    .split(",")
    .filter((s) => s.length > 0)
    .map(Number);
  return parts.every((n) => Number.isFinite(n)) && parts.length > 0 ? parts : fallback;
}

function color(attrs: Attrs, fallback: string): string {
  return attrs["color"] ?? fallback;
}

function opacity(attrs: Attrs, fallback: number): number {
  return num(attrs["opacity"], fallback);
}

function label(attrs: Attrs): string {
  return attrs["label"] ?? attrs["name"] ?? "";
}

function cross(a: number[], b: number[]): number[] {
  return [
    (a[1] ?? 0) * (b[2] ?? 0) - (a[2] ?? 0) * (b[1] ?? 0),
    (a[2] ?? 0) * (b[0] ?? 0) - (a[0] ?? 0) * (b[2] ?? 0),
    (a[0] ?? 0) * (b[1] ?? 0) - (a[1] ?? 0) * (b[0] ?? 0),
  ];
}

function normalize(v: number[]): number[] {
  const len = Math.hypot(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0) || 1;
  return [(v[0] ?? 0) / len, (v[1] ?? 0) / len, (v[2] ?? 0) / len];
}

/* -------------------------------------------------------------------------- */
/* Path predicates                                                            */
/* -------------------------------------------------------------------------- */

export function isGeometryPath(path: string): boolean {
  return path.startsWith("math.geometry.");
}

export function isScenePath(path: string): boolean {
  return path === "math.geometry.2d.scene" || path === "math.geometry.3d.scene";
}

/* -------------------------------------------------------------------------- */
/* Scene assembly                                                             */
/* -------------------------------------------------------------------------- */

export function sceneSpec(scene: ObjectNode): SceneSpec {
  const dim: "2d" | "3d" = scene.path.includes(".3d.") ? "3d" : "2d";
  const data: Trace[] = [];
  for (const child of scene.children) {
    if (child.type === "object" && isGeometryPath(child.path)) {
      for (const trace of toPlotly(child, dim)) data.push(trace);
    }
  }
  const width = num(scene.attrs["width"], 600);
  const height = num(scene.attrs["height"], 400);

  if (dim === "3d") {
    return {
      data,
      layout: {
        width,
        height,
        margin: { l: 0, r: 0, t: 0, b: 0 },
        showlegend: false,
        scene: { aspectmode: "data" },
      },
    };
  }

  // 2D: derive a square view from the finite objects so an "infinite" droite
  // does not blow up the auto-range; it gets clipped to the visible window.
  const b = bounds2d(scene);
  const xaxis: Record<string, unknown> = { scaleanchor: "y", zeroline: true };
  const yaxis: Record<string, unknown> = { zeroline: true };
  if (b) {
    xaxis["range"] = [b.cx - b.h, b.cx + b.h];
    yaxis["range"] = [b.cy - b.h, b.cy + b.h];
  }
  return {
    data,
    layout: {
      width,
      height,
      margin: { l: 36, r: 12, t: 12, b: 36 },
      showlegend: false,
      xaxis,
      yaxis,
    },
  };
}

/** Bounding box of the *finite* 2D objects (ignores the infinite droite). */
function bounds2d(scene: ObjectNode): { cx: number; cy: number; h: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let any = false;
  const add = (x: number, y: number): void => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    any = true;
  };

  for (const child of scene.children) {
    if (child.type !== "object") continue;
    const a = child.attrs;
    switch (child.path) {
      case "math.geometry.2d.point": {
        const p = a["x"] !== undefined ? [num(a["x"], 0), num(a["y"], 0)] : vec(a["at"], [0, 0]);
        add(p[0]!, p[1]!);
        break;
      }
      case "math.geometry.2d.circle": {
        const c = vec(a["center"], [0, 0]);
        const r = num(a["radius"], 1);
        add(c[0]! - r, c[1]! - r);
        add(c[0]! + r, c[1]! + r);
        break;
      }
      case "math.geometry.2d.polygon": {
        for (const part of (a["points"] ?? "").split(";")) {
          const p = vec(part, []);
          if (p.length >= 2) add(p[0]!, p[1]!);
        }
        break;
      }
      case "math.geometry.2d.segment": {
        const f = vec(a["from"], [0, 0]);
        const t = vec(a["to"], [0, 0]);
        add(f[0]!, f[1]!);
        add(t[0]!, t[1]!);
        break;
      }
      default:
        break; // droite is infinite → ignored
    }
  }

  if (!any) return null;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const half = Math.max(maxX - minX, maxY - minY) / 2 || 1;
  return { cx, cy, h: half * 1.2 + 0.5 };
}

/* -------------------------------------------------------------------------- */
/* Per-object traces                                                          */
/* -------------------------------------------------------------------------- */

export function toPlotly(node: ObjectNode, _dim: "2d" | "3d" = "3d"): Trace[] {
  const a = node.attrs;
  switch (node.path) {
    case "math.geometry.3d.point":
      return point3d(a);
    case "math.geometry.3d.vector":
      return vector3d(a);
    case "math.geometry.3d.segment":
      return segment3d(a);
    case "math.geometry.3d.line":
      return line3d(a);
    case "math.geometry.3d.plane":
      return plane3d(a);
    case "math.geometry.3d.sphere":
      return sphere3d(a);
    case "math.geometry.2d.point":
      return point2d(a);
    case "math.geometry.2d.segment":
      return segment2d(a);
    case "math.geometry.2d.circle":
      return circle2d(a);
    case "math.geometry.2d.polygon":
      return polygon2d(a);
    case "math.geometry.2d.droite":
      return droite2d(a);
    default:
      return [];
  }
}

/* --- 3D --- */

function point3d(a: Attrs): Trace[] {
  const p =
    a["x"] !== undefined
      ? [num(a["x"], 0), num(a["y"], 0), num(a["z"], 0)]
      : vec(a["at"] ?? a["center"]);
  const name = a["name"] ?? a["label"] ?? "";
  return [
    {
      type: "scatter3d",
      mode: name ? "markers+text" : "markers",
      x: [p[0]],
      y: [p[1]],
      z: [p[2]],
      marker: { size: 4, color: color(a, "#d62728") },
      text: name ? [name] : [],
      textposition: "top center",
      name,
      hoverinfo: "x+y+z",
    },
  ];
}

function vector3d(a: Attrs): Trace[] {
  const from = vec(a["from"]);
  const to = vec(a["to"]);
  const c = color(a, "#1f77b4");
  const dir = [
    (to[0] ?? 0) - (from[0] ?? 0),
    (to[1] ?? 0) - (from[1] ?? 0),
    (to[2] ?? 0) - (from[2] ?? 0),
  ];
  return [
    {
      type: "scatter3d",
      mode: "lines",
      x: [from[0], to[0]],
      y: [from[1], to[1]],
      z: [from[2], to[2]],
      line: { color: c, width: 5 },
      hoverinfo: "skip",
      name: label(a),
    },
    {
      type: "cone",
      x: [to[0]],
      y: [to[1]],
      z: [to[2]],
      u: [dir[0]],
      v: [dir[1]],
      w: [dir[2]],
      anchor: "tip",
      sizemode: "absolute",
      sizeref: 0.25,
      showscale: false,
      colorscale: [
        [0, c],
        [1, c],
      ],
      hoverinfo: "skip",
    },
  ];
}

function segment3d(a: Attrs): Trace[] {
  const from = vec(a["from"]);
  const to = vec(a["to"]);
  return [
    {
      type: "scatter3d",
      mode: "lines",
      x: [from[0], to[0]],
      y: [from[1], to[1]],
      z: [from[2], to[2]],
      line: { color: color(a, "#2ca02c"), width: 5 },
      name: label(a),
      hoverinfo: "skip",
    },
  ];
}

function line3d(a: Attrs): Trace[] {
  const p = vec(a["point"] ?? a["from"]);
  const dir = a["dir"] !== undefined ? vec(a["dir"]) : sub(vec(a["to"]), vec(a["from"]));
  const d = normalize(dir);
  const t = 10;
  const start = [p[0]! - d[0]! * t, p[1]! - d[1]! * t, p[2]! - d[2]! * t];
  const end = [p[0]! + d[0]! * t, p[1]! + d[1]! * t, p[2]! + d[2]! * t];
  return [
    {
      type: "scatter3d",
      mode: "lines",
      x: [start[0], end[0]],
      y: [start[1], end[1]],
      z: [start[2], end[2]],
      line: { color: color(a, "#9467bd"), width: 3 },
      name: label(a),
      hoverinfo: "skip",
    },
  ];
}

function plane3d(a: Attrs): Trace[] {
  const n = vec(a["normal"], [0, 0, 1]);
  const d = num(a["d"], 0);
  const nn = (n[0] ?? 0) ** 2 + (n[1] ?? 0) ** 2 + (n[2] ?? 0) ** 2 || 1;
  const center = [(n[0]! * d) / nn, (n[1]! * d) / nn, (n[2]! * d) / nn];
  const seed = Math.abs(n[0] ?? 0) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = normalize(cross(n, seed));
  const v = normalize(cross(n, u));
  const s = 5;
  const corner = (sa: number, sb: number): number[] => [
    center[0]! + (sa * u[0]! + sb * v[0]!) * s,
    center[1]! + (sa * u[1]! + sb * v[1]!) * s,
    center[2]! + (sa * u[2]! + sb * v[2]!) * s,
  ];
  const corners = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
  return [
    {
      type: "mesh3d",
      x: corners.map((p) => p[0]),
      y: corners.map((p) => p[1]),
      z: corners.map((p) => p[2]),
      i: [0, 0],
      j: [1, 2],
      k: [2, 3],
      color: color(a, "#1f77b4"),
      opacity: opacity(a, 0.5),
      flatshading: true,
      hoverinfo: "skip",
      name: label(a),
    },
  ];
}

function sphere3d(a: Attrs): Trace[] {
  const c = vec(a["center"]);
  const r = num(a["radius"], 1);
  const M = 18;
  const N = 28;
  const x: number[][] = [];
  const y: number[][] = [];
  const z: number[][] = [];
  for (let i = 0; i <= M; i++) {
    const phi = (Math.PI * i) / M;
    const rx: number[] = [];
    const ry: number[] = [];
    const rz: number[] = [];
    for (let j = 0; j <= N; j++) {
      const th = (2 * Math.PI * j) / N;
      rx.push(c[0]! + r * Math.sin(phi) * Math.cos(th));
      ry.push(c[1]! + r * Math.sin(phi) * Math.sin(th));
      rz.push(c[2]! + r * Math.cos(phi));
    }
    x.push(rx);
    y.push(ry);
    z.push(rz);
  }
  const col = color(a, "#1f77b4");
  return [
    {
      type: "surface",
      x,
      y,
      z,
      opacity: opacity(a, 0.5),
      showscale: false,
      colorscale: [
        [0, col],
        [1, col],
      ],
      hoverinfo: "skip",
      name: label(a),
    },
  ];
}

/* --- 2D --- */

function point2d(a: Attrs): Trace[] {
  const p =
    a["x"] !== undefined ? [num(a["x"], 0), num(a["y"], 0)] : vec(a["at"], [0, 0]);
  const name = a["name"] ?? a["label"] ?? "";
  return [
    {
      type: "scatter",
      mode: name ? "markers+text" : "markers",
      x: [p[0]],
      y: [p[1]],
      marker: { size: 9, color: color(a, "#d62728") },
      text: name ? [name] : [],
      textposition: "top center",
      name,
    },
  ];
}

function segment2d(a: Attrs): Trace[] {
  const from = vec(a["from"], [0, 0]);
  const to = vec(a["to"], [0, 0]);
  return [
    {
      type: "scatter",
      mode: "lines",
      x: [from[0], to[0]],
      y: [from[1], to[1]],
      line: { color: color(a, "#2ca02c"), width: 3 },
      name: label(a),
    },
  ];
}

function circle2d(a: Attrs): Trace[] {
  const c = vec(a["center"], [0, 0]);
  const r = num(a["radius"], 1);
  const x: number[] = [];
  const y: number[] = [];
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const th = (2 * Math.PI * i) / N;
    x.push(c[0]! + r * Math.cos(th));
    y.push(c[1]! + r * Math.sin(th));
  }
  return [
    {
      type: "scatter",
      mode: "lines",
      x,
      y,
      line: { color: color(a, "#1f77b4"), width: 2 },
      fill: a["opacity"] !== undefined ? "toself" : "none",
      opacity: opacity(a, 1),
      name: label(a),
    },
  ];
}

function polygon2d(a: Attrs): Trace[] {
  const pts = (a["points"] ?? "")
    .split(";")
    .map((s) => vec(s, []))
    .filter((p) => p.length >= 2);
  const x = pts.map((p) => p[0]);
  const y = pts.map((p) => p[1]);
  if (pts.length > 0) {
    x.push(pts[0]![0]);
    y.push(pts[0]![1]);
  }
  return [
    {
      type: "scatter",
      mode: "lines",
      x,
      y,
      fill: "toself",
      line: { color: color(a, "#ff7f0e"), width: 2 },
      opacity: opacity(a, 0.4),
      name: label(a),
    },
  ];
}

function droite2d(a: Attrs): Trace[] {
  const p = vec(a["point"] ?? a["from"], [0, 0]);
  const dir =
    a["dir"] !== undefined ? vec(a["dir"], [1, 0]) : sub(vec(a["to"], [1, 0]), p);
  const len = Math.hypot(dir[0] ?? 0, dir[1] ?? 0) || 1;
  const d = [(dir[0] ?? 0) / len, (dir[1] ?? 0) / len];
  const t = 100;
  return [
    {
      type: "scatter",
      mode: "lines",
      x: [p[0]! - d[0]! * t, p[0]! + d[0]! * t],
      y: [p[1]! - d[1]! * t, p[1]! + d[1]! * t],
      line: { color: color(a, "#9467bd"), width: 2 },
      name: label(a),
    },
  ];
}

function sub(a: number[], b: number[]): number[] {
  return [(a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0)];
}

/* -------------------------------------------------------------------------- */
/* LaTeX notation (used when a geometric object is OUTSIDE a scene)           */
/* -------------------------------------------------------------------------- */

export function latexOfGeometry(node: ObjectNode): string {
  const a = node.attrs;
  switch (node.path) {
    case "math.geometry.3d.point":
    case "math.geometry.2d.point": {
      const coords =
        a["x"] !== undefined
          ? [a["x"], a["y"], a["z"]].filter((v) => v !== undefined).join(", ")
          : vec(a["at"] ?? a["center"]).join(", ");
      const name = a["name"] ?? a["label"];
      return name ? `${name}(${coords})` : `(${coords})`;
    }
    case "math.geometry.3d.vector": {
      const d = sub(vec(a["to"]), vec(a["from"]));
      return `\\vec{u} = (${d.join(", ")})`;
    }
    case "math.geometry.3d.plane":
      return `${planeEquation(vec(a["normal"], [0, 0, 1]))} = ${num(a["d"], 0)}`;
    case "math.geometry.3d.sphere": {
      const c = vec(a["center"]);
      const r = num(a["radius"], 1);
      return `(x ${term(c[0]!)})^2 + (y ${term(c[1]!)})^2 + (z ${term(c[2]!)})^2 = ${r * r}`;
    }
    case "math.geometry.2d.circle": {
      const c = vec(a["center"], [0, 0]);
      const r = num(a["radius"], 1);
      return `(x ${term(c[0]!)})^2 + (y ${term(c[1]!)})^2 = ${r * r}`;
    }
    case "math.geometry.3d.segment":
    case "math.geometry.2d.segment":
      return `[(${vec(a["from"]).join(", ")})(${vec(a["to"]).join(", ")})]`;
    case "math.geometry.3d.line":
    case "math.geometry.2d.droite":
      return `(\\Delta)`;
    case "math.geometry.2d.polygon":
      return `\\text{polygone}`;
    default:
      return node.path;
  }
}

function planeEquation(n: number[]): string {
  const vars = ["x", "y", "z"];
  const parts: string[] = [];
  n.forEach((coef, i) => {
    if (coef === 0) return;
    const sign = parts.length === 0 ? (coef < 0 ? "-" : "") : coef < 0 ? " - " : " + ";
    const mag = Math.abs(coef);
    parts.push(`${sign}${mag === 1 ? "" : mag}${vars[i]}`);
  });
  return parts.length > 0 ? parts.join("") : "0";
}

/** Render "- c" for a positive center component (so we get (x - 2)). */
function term(c: number): string {
  if (c === 0) return "";
  return c > 0 ? `- ${c}` : `+ ${-c}`;
}
