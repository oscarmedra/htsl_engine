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
  ArrowHelper: Ctor;
  AxesHelper: Ctor;
  GridHelper: Ctor;
  PointLight: Ctor;
  AmbientLight: Ctor;
  OrbitControls?: Ctor;
}
export interface ThreeWindow {
  THREE: ThreeNS | undefined;
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

function buildObject(o: ThreeObject, T: ThreeNS): any {
  switch (o.type) {
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

  const animated: Array<{ obj: any; spin: number; orbit: number; speed: number; angle: number }> = [];
  for (const o of spec.objects) {
    const obj = buildObject(o, T);
    if (!obj) continue;
    group.add(obj);
    if (o.spin || o.orbit) animated.push({ obj, spin: o.spin, orbit: o.orbit, speed: o.speed, angle: 0 });
  }

  let controls: any = null;
  if (spec.controls && T.OrbitControls) {
    controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
  }

  let raf = 0;
  let alive = true;
  let auto = 0;
  const tick = (): void => {
    if (!alive) return;
    for (const a of animated) {
      if (a.spin) a.obj.rotation.y += a.spin;
      if (a.orbit) {
        a.angle += a.speed;
        a.obj.position.x = Math.cos(a.angle) * a.orbit;
        a.obj.position.z = Math.sin(a.angle) * a.orbit;
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
