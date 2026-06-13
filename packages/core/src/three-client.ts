/**
 * Browser-side drawing for declarative animated 3D scenes (low level; the
 * {@link "./runtime"} runtime is the high-level, dependency-aware entry point).
 *
 * The renderer emits each scene as a declarative
 * `<div class="htsl-three" data-htsl-three='{…}' data-htsl-hash="…">` node —
 * never a `<script>`. Given a Three.js instance + the target window's
 * requestAnimationFrame, these helpers build, animate and tear down those nodes.
 *
 * Idempotent: a node already drawn at the same hash is left untouched. A node
 * whose hash changed is **rebuilt** (Three has no in-place "react"). A removed
 * node is torn down (animation stopped, renderer disposed + WebGL context freed).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ThreeObject, ThreeSpec } from "./objects/three.js";

type Ctor = new (...args: any[]) => any;
export interface ThreeNS {
  Scene: Ctor;
  Group: Ctor;
  PerspectiveCamera: Ctor;
  WebGLRenderer: Ctor;
  Color: Ctor;
  Vector3: Ctor;
  Quaternion: Ctor;
  SphereGeometry: Ctor;
  BoxGeometry: Ctor;
  TorusGeometry: Ctor;
  CylinderGeometry: Ctor;
  ConeGeometry: Ctor;
  PlaneGeometry: Ctor;
  BufferGeometry: Ctor;
  BufferAttribute: Ctor;
  Float32BufferAttribute: Ctor;
  DoubleSide: number;
  MeshStandardMaterial: Ctor;
  MeshBasicMaterial: Ctor;
  LineBasicMaterial: Ctor;
  Mesh: Ctor;
  Line: Ctor;
  Sprite: Ctor;
  SpriteMaterial: Ctor;
  CanvasTexture: Ctor;
  ArrowHelper: Ctor;
  AxesHelper: Ctor;
  GridHelper: Ctor;
  PointLight: Ctor;
  AmbientLight: Ctor;
  OrbitControls?: Ctor;
}
export interface ThreeWindow {
  THREE: ThreeNS | undefined;
  document: Document;
  requestAnimationFrame(cb: (t: number) => void): number;
  cancelAnimationFrame(id: number): void;
}

interface Instance {
  stop(): void;
}
const SLOT = "__htslThree";

function quickHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
function key(el: Element): string {
  return el.getAttribute("data-htsl-hash") ?? quickHash(el.getAttribute("data-htsl-three") ?? "");
}
function isPending(el: Element): boolean {
  return el.getAttribute("data-htsl-init") !== key(el);
}

/** Scenes under `root` still needing a (re)build (no Three.js needed to check). */
export function pendingThree(root: ParentNode): Element[] {
  const out: Element[] = [];
  root.querySelectorAll(".htsl-three[data-htsl-three]").forEach((el) => {
    if (isPending(el)) out.push(el);
  });
  return out;
}

function teardown(el: Element): void {
  const inst = (el as any)[SLOT] as Instance | undefined;
  if (inst) {
    inst.stop();
    delete (el as any)[SLOT];
  }
}

/** Build / rebuild every pending 3D scene under `root`. */
export function hydrateThree(root: ParentNode, win: ThreeWindow): number {
  const THREE = win.THREE;
  if (!THREE) return 0;
  let drawn = 0;
  root.querySelectorAll(".htsl-three[data-htsl-three]").forEach((el) => {
    if (!isPending(el)) return;
    const raw = el.getAttribute("data-htsl-three");
    if (!raw) return;
    let spec: ThreeSpec;
    try {
      spec = JSON.parse(raw) as ThreeSpec;
    } catch {
      return;
    }
    teardown(el); // hash changed → rebuild from scratch
    try {
      build(el, spec, THREE, win);
      el.setAttribute("data-htsl-init", key(el));
      drawn += 1;
    } catch {
      /* WebGL unavailable / bad spec → leave the fallback message */
    }
  });
  return drawn;
}

/** Tear down 3D scenes being removed/replaced (stops RAF, frees WebGL context). */
export function purgeThree(removed: Iterable<Element>): void {
  for (const el of removed) {
    if (el.classList?.contains("htsl-three")) teardown(el);
    el.querySelectorAll?.(".htsl-three").forEach(teardown);
  }
}

/* -------------------------------------------------------------------------- */

function geometry(o: ThreeObject, T: ThreeNS): any {
  switch (o.shape) {
    case "box":
      return new T.BoxGeometry(o.size, o.size, o.size);
    case "torus":
      return new T.TorusGeometry(o.size, o.tube, 24, 80);
    case "cylinder":
      return new T.CylinderGeometry(o.size, o.size, o.height, 40);
    case "cone":
      return new T.ConeGeometry(o.size, o.height, 40);
    case "plane":
      return new T.PlaneGeometry(o.size, o.size);
    default: // sphere / point
      return new T.SphereGeometry(o.size, 32, 24);
  }
}

/** A billboard text label (canvas texture on a Sprite — no addon, always faces
 *  the camera, crisp). */
function makeLabel(text: string, color: string, worldSize: number, T: ThreeNS, doc: Document): any {
  const fontPx = 64;
  const pad = 14;
  const measure = doc.createElement("canvas").getContext("2d")!;
  measure.font = `bold ${fontPx}px system-ui, -apple-system, sans-serif`;
  const tw = Math.max(1, Math.ceil(measure.measureText(text).width));
  const canvas = doc.createElement("canvas");
  canvas.width = tw + pad * 2;
  canvas.height = fontPx + pad * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `bold ${fontPx}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, pad, canvas.height / 2);
  const tex = new T.CanvasTexture(canvas);
  const mat = new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new T.Sprite(mat);
  sprite.scale.set((worldSize * canvas.width) / canvas.height, worldSize, 1);
  return sprite;
}

function buildObject(o: ThreeObject, T: ThreeNS, doc: Document): any {
  switch (o.type) {
    case "label": {
      const sprite = makeLabel(o.text || "?", o.color === "#ffffff" ? "#e5e7eb" : o.color, o.size, T, doc);
      sprite.position.set(o.x, o.y, o.z);
      return sprite;
    }
    case "mesh": {
      const transparent = o.opacity < 1;
      const mat = o.glow
        ? new T.MeshBasicMaterial({ color: o.color, transparent, opacity: o.opacity })
        : new T.MeshStandardMaterial({ color: o.color, transparent, opacity: o.opacity });
      const mesh = new T.Mesh(geometry(o, T), mat);
      if (o.shape === "plane") mesh.rotation.x = -Math.PI / 2; // lie flat by default
      mesh.position.set(o.x, o.y, o.z);
      return mesh;
    }
    case "vector": {
      const from = new T.Vector3(o.from[0], o.from[1], o.from[2]);
      const to = new T.Vector3(o.to[0], o.to[1], o.to[2]);
      const dir = to.clone().sub(from);
      const len = dir.length() || 1;
      dir.normalize();
      const hex = new T.Color(o.color).getHex();
      return new T.ArrowHelper(dir, from, len, hex, Math.min(0.4, len * 0.25), Math.min(0.25, len * 0.16));
    }
    case "line": {
      const pts = o.points.map((p) => new T.Vector3(p[0], p[1], p[2]));
      const geo = new T.BufferGeometry().setFromPoints(pts);
      return new T.Line(geo, new T.LineBasicMaterial({ color: o.color }));
    }
    case "surface": {
      const { res, xmin, xmax, ymin, ymax, heights } = o;
      const pos = new Float32Array(res * res * 3);
      for (let j = 0; j < res; j++) {
        for (let i = 0; i < res; i++) {
          const k = j * res + i;
          pos[k * 3] = xmin + ((xmax - xmin) * i) / (res - 1);
          pos[k * 3 + 1] = heights[k] ?? 0; // height = up (y)
          pos[k * 3 + 2] = ymin + ((ymax - ymin) * j) / (res - 1);
        }
      }
      const idx: number[] = [];
      for (let j = 0; j < res - 1; j++) {
        for (let i = 0; i < res - 1; i++) {
          const a = j * res + i;
          idx.push(a, a + res, a + 1, a + 1, a + res, a + res + 1);
        }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mat = new T.MeshStandardMaterial({
        color: o.color,
        transparent: o.opacity < 1,
        opacity: o.opacity,
        side: T.DoubleSide,
        flatShading: false,
      });
      return new T.Mesh(geo, mat);
    }
    case "axes":
      return new T.AxesHelper(o.size);
    case "grid":
      return new T.GridHelper(o.size, o.divisions);
  }
}

interface AnimState {
  pos: any;
  quat: any;
  scale: any;
  color: any;
  opacity: number;
}
interface Segment {
  start: number;
  end: number;
  from: AnimState;
  to: AnimState;
  easing: string;
}

function ease(p: number, kind: string): number {
  const t = Math.max(0, Math.min(1, p));
  switch (kind) {
    case "linear":
      return t;
    case "easeIn":
      return t * t;
    case "easeOut":
      return 1 - (1 - t) * (1 - t);
    default: // easeInOut
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}

/* -------------------------------------------------------------------------- */
/* Real geometry morphing (transform A → B) via a shared canonical grid        */
/* -------------------------------------------------------------------------- */

const MORPHABLE = new Set(["sphere", "box", "torus", "cylinder", "cone", "plane", "point"]);
const MW = 48; // grid columns (around)
const MH = 32; // grid rows (along)

function gridIndex(): number[] {
  const idx: number[] = [];
  for (let j = 0; j < MH; j++) {
    for (let i = 0; i < MW; i++) {
      const a = j * (MW + 1) + i;
      const b = a + 1;
      const c = a + (MW + 1);
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  return idx;
}

/** Sample a shape onto the canonical (MW+1)×(MH+1) grid → flat positions. So any
 *  two morphable shapes share vertex count/order and can be lerped vertex-wise. */
function shapePositions(o: ThreeObject): Float32Array {
  const pos = new Float32Array((MW + 1) * (MH + 1) * 3);
  let k = 0;
  for (let j = 0; j <= MH; j++) {
    const v = j / MH;
    for (let i = 0; i <= MW; i++) {
      const u = i / MW;
      const th = u * Math.PI * 2;
      let x = 0;
      let y = 0;
      let z = 0;
      switch (o.shape) {
        case "box": {
          const half = o.size / 2;
          const ph = v * Math.PI;
          const sp = Math.sin(ph);
          const dx = sp * Math.cos(th);
          const dy = Math.cos(ph);
          const dz = sp * Math.sin(th);
          const m = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) || 1;
          x = (dx / m) * half;
          y = (dy / m) * half;
          z = (dz / m) * half;
          break;
        }
        case "torus": {
          const ph = v * Math.PI * 2;
          x = (o.size + o.tube * Math.cos(ph)) * Math.cos(th);
          z = (o.size + o.tube * Math.cos(ph)) * Math.sin(th);
          y = o.tube * Math.sin(ph);
          break;
        }
        case "cylinder":
          x = o.size * Math.cos(th);
          z = o.size * Math.sin(th);
          y = (v - 0.5) * o.height;
          break;
        case "cone": {
          const r = o.size * (1 - v);
          x = r * Math.cos(th);
          z = r * Math.sin(th);
          y = (v - 0.5) * o.height;
          break;
        }
        case "plane":
          x = (u - 0.5) * o.size;
          z = (v - 0.5) * o.size;
          y = 0;
          break;
        default: {
          // sphere / point
          const ph = v * Math.PI;
          const sp = Math.sin(ph);
          x = o.size * sp * Math.cos(th);
          y = o.size * Math.cos(ph);
          z = o.size * sp * Math.sin(th);
        }
      }
      pos[k++] = x;
      pos[k++] = y;
      pos[k++] = z;
    }
  }
  return pos;
}

/** Build a mesh whose geometry can morph from shape `a` to shape `b`. */
function buildMorphMesh(a: ThreeObject, b: ThreeObject, T: ThreeNS): any {
  const idx = gridIndex();
  const aPos = shapePositions(a);
  const bPos = shapePositions(b);

  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(aPos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const bGeo = new T.BufferGeometry();
  bGeo.setAttribute("position", new T.Float32BufferAttribute(bPos.slice(), 3));
  bGeo.setIndex(idx);
  bGeo.computeVertexNormals();

  geo.morphAttributes.position = [new T.Float32BufferAttribute(bPos, 3)];
  geo.morphAttributes.normal = [bGeo.getAttribute("normal")];

  const transparent = a.opacity < 1;
  const mat = a.glow
    ? new T.MeshBasicMaterial({ color: a.color, transparent, opacity: a.opacity, morphTargets: true })
    : new T.MeshStandardMaterial({
        color: a.color,
        transparent,
        opacity: a.opacity,
        side: T.DoubleSide,
        morphTargets: true,
        morphNormals: true,
      });
  const mesh = new T.Mesh(geo, mat);
  mesh.morphTargetInfluences = [0];
  mesh.position.set(a.x, a.y, a.z);
  return mesh;
}

function build(el: Element, spec: ThreeSpec, T: ThreeNS, win: ThreeWindow): void {
  const w = Math.max(1, spec.width);
  const h = Math.max(1, spec.height);

  const scene = new T.Scene();
  scene.background = new T.Color(spec.background);

  const camera = new T.PerspectiveCamera(60, w / h, 0.1, 1000);
  const d = spec.distance;
  camera.position.set(d * 0.55, d * 0.45, d);
  camera.lookAt(0, 0, 0);

  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  el.textContent = "";
  el.appendChild(renderer.domElement as Node);

  scene.add(new T.AmbientLight(0xffffff, 0.45));
  const light = new T.PointLight(0xffffff, 2);
  light.position.set(6, 8, 6);
  scene.add(light);

  const group = new T.Group();
  scene.add(group);

  const doc = win.document;
  const targets = new Set(spec.animations.map((a) => a.target));
  // First transform per target → the shape it morphs into.
  const transformTo: Record<string, string> = {};
  for (const a of spec.animations) {
    if (a.action === "transform" && a.toId && !(a.target in transformTo)) transformTo[a.target] = a.toId;
  }
  const specById: Record<string, ThreeObject> = {};
  for (const o of spec.objects) if (o.id) specById[o.id] = o;

  const byId: Record<string, { obj: any; o: ThreeObject }> = {};
  const morphMeshById: Record<string, any> = {};
  const animated: Array<{ obj: any; spin: number; orbit: number; speed: number; angle: number }> = [];
  for (const o of spec.objects) {
    // A transform target whose source and reference are both morphable shapes
    // gets a real geometry morph (box → sphere, etc.).
    const toId = o.id ? transformTo[o.id] : undefined;
    const b = toId ? specById[toId] : undefined;
    const morphable =
      o.type === "mesh" && MORPHABLE.has(o.shape) && b && b.type === "mesh" && MORPHABLE.has(b.shape);
    const obj = morphable ? buildMorphMesh(o, b!, T) : buildObject(o, T, doc);
    if (morphable && o.id) morphMeshById[o.id] = obj;
    if (obj) {
      group.add(obj);
      if (o.id) byId[o.id] = { obj, o };
      // spin/orbit and a timeline are mutually exclusive on the same object.
      if ((o.spin || o.orbit) && !targets.has(o.id)) {
        animated.push({ obj, spin: o.spin, orbit: o.orbit, speed: o.speed, angle: 0 });
      }
    }
    if (o.label && o.type !== "label") {
      const lbl = makeLabel(o.label, o.color === "#ffffff" ? "#e5e7eb" : o.color, 0.4, T, doc);
      lbl.position.set(o.x, o.y + (o.size || 0.3) + 0.35, o.z);
      group.add(lbl);
    }
  }

  /* Build the animation timeline: per target, sequential channels by default. */
  const cloneSt = (s: AnimState): AnimState => ({
    pos: s.pos.clone(),
    quat: s.quat.clone(),
    scale: s.scale.clone(),
    color: s.color.clone(),
    opacity: s.opacity,
  });
  const segsByTarget: Record<string, Segment[]> = {};
  const stateById: Record<string, AnimState> = {};
  const cursor: Record<string, number> = {};
  const morphs: Array<{ mesh: any; start: number; end: number; easing: string }> = [];
  let totalDur = 0;
  for (const a of spec.animations) {
    const entry = byId[a.target];
    if (!entry) continue;
    if (!stateById[a.target]) {
      const o = entry.o;
      stateById[a.target] = {
        pos: new T.Vector3(o.x, o.y, o.z),
        quat: new T.Quaternion(),
        scale: new T.Vector3(1, 1, 1),
        color: new T.Color(o.color),
        opacity: o.opacity,
      };
      cursor[a.target] = 0;
    }
    const S = stateById[a.target]!;
    const start = (a.at != null ? a.at : cursor[a.target]!) + a.delay;
    const from = cloneSt(S);
    // Apply the action to the running state → the segment's target state.
    if (a.action === "move" && a.hasTo) S.pos.set(a.to[0], a.to[1], a.to[2]);
    else if (a.action === "rotate") {
      const ax = new T.Vector3(a.axis === "x" ? 1 : 0, a.axis === "y" ? 1 : 0, a.axis === "z" ? 1 : 0);
      const q = new T.Quaternion().setFromAxisAngle(ax, (a.angle * Math.PI) / 180);
      S.quat.multiply(q);
    } else if (a.action === "scale") {
      if (a.hasTo) S.scale.set(a.to[0], a.to[1], a.to[2]);
      else S.scale.setScalar(a.value);
    } else if (a.action === "color" && a.color) S.color.set(a.color);
    else if (a.action === "fade") S.opacity = a.value;
    else if (a.action === "transform") {
      // Morph the SHAPE + colour in place (the geometry morph handles size).
      // B is a template — its own position is irrelevant; use `move` to relocate.
      const b = byId[a.toId]?.o;
      if (b) S.color.set(b.color);
    }
    const end = start + a.duration;
    (segsByTarget[a.target] ??= []).push({ start, end, from, to: cloneSt(S), easing: a.easing });
    if (a.action === "transform" && morphMeshById[a.target]) {
      morphs.push({ mesh: morphMeshById[a.target], start, end, easing: a.easing });
    }
    cursor[a.target] = Math.max(cursor[a.target]!, end);
    totalDur = Math.max(totalDur, end);
  }
  const hasTimeline = totalDur > 0;
  const tmp: AnimState = {
    pos: new T.Vector3(),
    quat: new T.Quaternion(),
    scale: new T.Vector3(),
    color: new T.Color(),
    opacity: 1,
  };
  const stateAt = (segs: Segment[], t: number): AnimState => {
    if (t <= segs[0]!.start) return segs[0]!.from;
    for (const s of segs) {
      if (t < s.start) return s.from; // gap before this segment → hold previous
      if (t < s.end) {
        const p = ease((t - s.start) / (s.end - s.start), s.easing);
        tmp.pos.lerpVectors(s.from.pos, s.to.pos, p);
        tmp.quat.slerpQuaternions(s.from.quat, s.to.quat, p);
        tmp.scale.lerpVectors(s.from.scale, s.to.scale, p);
        tmp.color.copy(s.from.color).lerp(s.to.color, p);
        tmp.opacity = s.from.opacity + (s.to.opacity - s.from.opacity) * p;
        return tmp;
      }
    }
    return segs[segs.length - 1]!.to;
  };
  const applyState = (obj: any, s: AnimState): void => {
    obj.position.copy(s.pos);
    obj.quaternion.copy(s.quat);
    obj.scale.copy(s.scale);
    const m = obj.material;
    if (m) {
      m.color?.copy?.(s.color);
      if (s.opacity < 1) m.transparent = true;
      m.opacity = s.opacity;
    }
  };

  let controls: any = null;
  if (spec.controls && T.OrbitControls) {
    controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
  }

  let raf = 0;
  let alive = true;
  let auto = 0;
  let startTs = 0;
  const tick = (now: number): void => {
    if (!alive) return;
    for (const a of animated) {
      if (a.spin) a.obj.rotation.y += a.spin;
      if (a.orbit) {
        a.angle += a.speed;
        a.obj.position.x = Math.cos(a.angle) * a.orbit;
        a.obj.position.z = Math.sin(a.angle) * a.orbit;
      }
    }
    if (hasTimeline) {
      if (!startTs) startTs = now;
      let t = (now - startTs) / 1000;
      t = spec.loop ? t % totalDur : Math.min(t, totalDur);
      for (const id in segsByTarget) applyState(byId[id]!.obj, stateAt(segsByTarget[id]!, t));
      // Real geometry morph: drive the morph-target influence over the segment.
      for (const m of morphs) {
        m.mesh.morphTargetInfluences[0] =
          t <= m.start ? 0 : t >= m.end ? 1 : ease((t - m.start) / (m.end - m.start), m.easing);
      }
    }
    if (spec.autorotate) {
      auto += 0.003;
      group.rotation.y = auto;
    }
    if (controls) controls.update();
    renderer.render(scene, camera);
    raf = win.requestAnimationFrame(tick);
  };
  raf = win.requestAnimationFrame(tick);

  (el as any)[SLOT] = {
    stop: () => {
      alive = false;
      win.cancelAnimationFrame(raf);
      if (controls) {
        try {
          controls.dispose();
        } catch {
          /* ignore */
        }
      }
      // Free geometries, materials and textures (canvas labels) of the scene.
      try {
        group.traverse((o: any) => {
          o.geometry?.dispose?.();
          const m = o.material;
          (Array.isArray(m) ? m : m ? [m] : []).forEach((mat: any) => {
            mat.map?.dispose?.();
            mat.dispose?.();
          });
        });
      } catch {
        /* ignore */
      }
      // Release the WebGL context immediately, else rapid rebuilds (every edit)
      // exhaust the browser's ~16-context limit and new renderers fail silently.
      try {
        renderer.forceContextLoss();
      } catch {
        /* ignore */
      }
      try {
        renderer.dispose();
      } catch {
        /* ignore */
      }
      (renderer.domElement as { remove?: () => void }).remove?.();
    },
  } satisfies Instance;
}
