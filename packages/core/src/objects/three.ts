/**
 * Declarative animated 3D scenes (WebGL / Three.js).
 *
 * Parallel to the Plotly geometry scenes, but for free-form animated 3D: the
 * renderer emits a **data node** `<div class="htsl-three" data-htsl-three='{…}'>`
 * — never a `<script>`. The runtime loads Three.js and draws/animates it.
 *
 * Objects (collection alias `s3` → `scene.3d`):
 *  - `{@s3.scene[width, height, background]: …actors…}`
 *  - `{@s3.sphere[radius, x, y, z, color, spin, orbit, speed, glow]/}`
 *  - `{@s3.box[size, x, y, z, color, spin, orbit, speed, glow]/}`
 *
 * `spin` = self-rotation per frame; `orbit`/`speed` = circular orbit around the
 * origin; `glow=true` = self-lit material (e.g. a sun).
 */
import { escapeHtml } from "../escape.js";
import type { ObjectNode } from "../types.js";

export interface ThreeObject {
  shape: "sphere" | "box";
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  spin: number;
  orbit: number;
  speed: number;
  glow: boolean;
}

export interface ThreeSpec {
  width: number;
  height: number;
  background: string;
  objects: ThreeObject[];
}

const THREE_PREFIX = "scene.3d.";

export function isThreePath(path: string): boolean {
  return path.startsWith(THREE_PREFIX);
}

function num(v: string | undefined, fallback: number): number {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function actor(n: ObjectNode): ThreeObject {
  const shape: "sphere" | "box" = n.path.endsWith(".box") ? "box" : "sphere";
  return {
    shape,
    x: num(n.attrs["x"], 0),
    y: num(n.attrs["y"], 0),
    z: num(n.attrs["z"], 0),
    size: shape === "box" ? num(n.attrs["size"], 1) : num(n.attrs["radius"], 0.5),
    color: n.attrs["color"] ?? "#ffffff",
    spin: num(n.attrs["spin"], 0),
    orbit: num(n.attrs["orbit"], 0),
    speed: num(n.attrs["speed"], 0),
    glow: n.attrs["glow"] === "true",
  };
}

/** Pure JSON description of a `{@s3.scene}` (its actors + canvas settings). */
export function threeSpec(scene: ObjectNode): ThreeSpec {
  const objects: ThreeObject[] = [];
  for (const child of scene.children) {
    if (child.type === "object" && (child.path === "scene.3d.sphere" || child.path === "scene.3d.box")) {
      objects.push(actor(child));
    }
  }
  return {
    width: num(scene.attrs["width"], 600),
    height: num(scene.attrs["height"], 400),
    background: scene.attrs["background"] ?? "#020617",
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
