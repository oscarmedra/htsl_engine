/**
 * Declarative animated 3D scenes (WebGL / Three.js) — useful primitives for
 * mathematicians and physicists.
 *
 * Parallel to the Plotly geometry scenes, but for free-form animated 3D: the
 * renderer emits a **data node** `<div class="htsl-three" data-htsl-three='{…}'>`
 * — never a `<script>`. The runtime loads Three.js and draws/animates it.
 *
 * Collection alias `s3` → `scene.3d`:
 *  - `{@s3.scene[width, height, background, distance, controls, autorotate]: …]`
 *  - meshes: `s3.sphere`, `s3.box`, `s3.torus`, `s3.cylinder`, `s3.cone`,
 *    `s3.plane`, `s3.point`
 *  - `s3.vector` (arrow), `s3.line` (polyline / trajectory)
 *  - helpers: `s3.axes`, `s3.grid`
 *
 * Common transforms: `x/y/z`, `color`, `opacity`, `spin` (self-rotation),
 * `orbit`+`speed` (circular orbit), `glow` (self-lit material).
 */
import { escapeHtml } from "../escape.js";
import { safeExpr } from "./expr.js";
import type { ObjectNode } from "../types.js";

export type ThreeShape = "sphere" | "box" | "torus" | "cylinder" | "cone" | "plane" | "point";

export interface ThreeObject {
  type: "mesh" | "vector" | "line" | "axes" | "grid" | "surface";
  shape: ThreeShape;
  x: number;
  y: number;
  z: number;
  color: string;
  opacity: number;
  glow: boolean;
  spin: number;
  orbit: number;
  speed: number;
  /** sphere/point radius · box "size" · plane side · torus/cylinder/cone radius */
  size: number;
  /** torus tube radius. */
  tube: number;
  /** cylinder/cone height. */
  height: number;
  /** vector arrow endpoints. */
  from: Vec3;
  to: Vec3;
  /** polyline / trajectory points (also: sampled parametric curve). */
  points: Vec3[];
  /** grid divisions / axes size. */
  divisions: number;
  /** surface z=f(x,y): row-major heights over a res×res grid + its bounds. */
  heights: number[];
  res: number;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

export interface ThreeSpec {
  width: number;
  height: number;
  background: string;
  /** camera distance from the origin (z). */
  distance: number;
  /** mouse orbit controls (loads the OrbitControls addon). */
  controls: boolean;
  /** slow automatic rotation of the whole scene. */
  autorotate: boolean;
  objects: ThreeObject[];
}

type Vec3 = [number, number, number];

const THREE_PREFIX = "scene.3d.";
export function isThreePath(path: string): boolean {
  return path.startsWith(THREE_PREFIX);
}

function num(v: string | undefined, fallback: number): number {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function bool(v: string | undefined): boolean {
  return v === "true" || v === "";
}
/** Parse "(a, b, c)" → [a, b, c] (missing components default to 0). */
function vec3(v: string | undefined, fallback: Vec3 = [0, 0, 0]): Vec3 {
  if (!v) return fallback;
  const parts = v.replace(/[()]/g, "").split(",").map((s) => Number(s.trim()));
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}
/** Parse "(a,b,c);(d,e,f);…" → list of points. */
function points(v: string | undefined): Vec3[] {
  if (!v) return [];
  return v
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => vec3(s));
}
/** Parse "(a, b)" → [a, b]. */
function range(v: string | undefined, fallback: [number, number]): [number, number] {
  if (!v) return fallback;
  const p = v.replace(/[()]/g, "").split(",").map((s) => Number(s.trim()));
  return [Number.isFinite(p[0]) ? p[0]! : fallback[0], Number.isFinite(p[1]) ? p[1]! : fallback[1]];
}
function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function base(n: ObjectNode, shape: ThreeShape, type: ThreeObject["type"]): ThreeObject {
  return {
    type,
    shape,
    x: num(n.attrs["x"], 0),
    y: num(n.attrs["y"], 0),
    z: num(n.attrs["z"], 0),
    color: n.attrs["color"] ?? "#ffffff",
    opacity: num(n.attrs["opacity"], 1),
    glow: bool(n.attrs["glow"]),
    spin: num(n.attrs["spin"], 0),
    orbit: num(n.attrs["orbit"], 0),
    speed: num(n.attrs["speed"], 0),
    size: num(n.attrs["size"], 1),
    tube: num(n.attrs["tube"], 0.3),
    height: num(n.attrs["height"], 1),
    from: vec3(n.attrs["from"]),
    to: vec3(n.attrs["to"], [1, 1, 1]),
    points: points(n.attrs["points"]),
    divisions: num(n.attrs["divisions"], 10),
    heights: [],
    res: 0,
    xmin: 0,
    xmax: 0,
    ymin: 0,
    ymax: 0,
  };
}

/** Translate one actor object node into its normalized 3D description. */
function actor(n: ObjectNode): ThreeObject | null {
  const suffix = n.path.slice(THREE_PREFIX.length);
  switch (suffix) {
    case "sphere":
      return { ...base(n, "sphere", "mesh"), size: num(n.attrs["radius"], 0.5) };
    case "point":
      return { ...base(n, "point", "mesh"), size: num(n.attrs["radius"], 0.12) };
    case "box":
      return { ...base(n, "box", "mesh"), size: num(n.attrs["size"], 1) };
    case "plane":
      return { ...base(n, "plane", "mesh"), size: num(n.attrs["size"], 6) };
    case "torus":
      return { ...base(n, "torus", "mesh"), size: num(n.attrs["radius"], 1) };
    case "cylinder":
      return { ...base(n, "cylinder", "mesh"), size: num(n.attrs["radius"], 0.5) };
    case "cone":
      return { ...base(n, "cone", "mesh"), size: num(n.attrs["radius"], 0.5) };
    case "vector":
      return base(n, "sphere", "vector");
    case "line":
      return base(n, "sphere", "line");
    case "curve": {
      // Parametric 3D curve (x(t), y(t), z(t)) sampled into points.
      const fx = safeExpr(n.attrs["x"] ?? "cos(t)");
      const fy = safeExpr(n.attrs["y"] ?? "sin(t)");
      const fz = safeExpr(n.attrs["z"] ?? "t/3");
      const [t0, t1] = range(n.attrs["trange"], [0, Math.PI * 2]);
      const N = clampInt(num(n.attrs["samples"], 200), 2, 4000);
      const pts: Vec3[] = [];
      for (let i = 0; i < N; i++) {
        const t = t0 + ((t1 - t0) * i) / (N - 1);
        pts.push([fx({ t }), fy({ t }), fz({ t })]);
      }
      return { ...base(n, "sphere", "line"), points: pts };
    }
    case "surface": {
      // z = f(x, y) sampled over a res×res grid → height field.
      const f = safeExpr(n.attrs["z"] ?? "0");
      const [x0, x1] = range(n.attrs["xrange"], [-3, 3]);
      const [y0, y1] = range(n.attrs["yrange"], [-3, 3]);
      const res = clampInt(num(n.attrs["res"], 36), 2, 120);
      const heights: number[] = [];
      for (let j = 0; j < res; j++) {
        for (let i = 0; i < res; i++) {
          const x = x0 + ((x1 - x0) * i) / (res - 1);
          const y = y0 + ((y1 - y0) * j) / (res - 1);
          const z = f({ x, y });
          heights.push(Number.isFinite(z) ? z : 0);
        }
      }
      return { ...base(n, "sphere", "surface"), heights, res, xmin: x0, xmax: x1, ymin: y0, ymax: y1 };
    }
    case "axes":
      return { ...base(n, "sphere", "axes"), size: num(n.attrs["size"], 3) };
    case "grid":
      return { ...base(n, "sphere", "grid"), size: num(n.attrs["size"], 10) };
    default:
      return null;
  }
}

/** Pure JSON description of a `{@s3.scene}` (its actors + canvas settings). */
export function threeSpec(scene: ObjectNode): ThreeSpec {
  const objects: ThreeObject[] = [];
  for (const child of scene.children) {
    if (child.type === "object" && isThreePath(child.path) && child.path !== "scene.3d.scene") {
      const a = actor(child);
      if (a) objects.push(a);
    }
  }
  return {
    width: num(scene.attrs["width"], 600),
    height: num(scene.attrs["height"], 400),
    background: scene.attrs["background"] ?? "#020617",
    distance: num(scene.attrs["distance"], 6),
    controls: bool(scene.attrs["controls"]),
    autorotate: bool(scene.attrs["autorotate"]),
    objects,
  };
}

/**
 * Render a `{@s3.scene}` as a declarative data node (no `<script>`). Actors used
 * outside a scene render nothing (they only make sense as children).
 */
export function renderThree(node: ObjectNode, hashAttr: string): string {
  if (node.path !== "scene.3d.scene") return "";
  const spec = threeSpec(node);
  const json = escapeHtml(JSON.stringify(spec));
  return (
    `<div class="htsl-three" data-htsl-three="${json}"${hashAttr} ` +
    `style="width:${spec.width}px;height:${spec.height}px">` +
    `<span class="htsl-scene-fallback">Scène 3D — Three.js requis.</span></div>`
  );
}
