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
 * node is torn down (animation stopped, renderer disposed, canvas dropped).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ThreeObject, ThreeSpec } from "./objects/three.js";

type Ctor = new (...args: any[]) => any;
export interface ThreeNS {
  Scene: Ctor;
  PerspectiveCamera: Ctor;
  WebGLRenderer: Ctor;
  Color: Ctor;
  SphereGeometry: Ctor;
  BoxGeometry: Ctor;
  MeshStandardMaterial: Ctor;
  MeshBasicMaterial: Ctor;
  Mesh: Ctor;
  PointLight: Ctor;
  AmbientLight: Ctor;
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

/** Tear down 3D scenes being removed/replaced (stops RAF, disposes the renderer). */
export function purgeThree(removed: Iterable<Element>): void {
  for (const el of removed) {
    if (el.classList?.contains("htsl-three")) teardown(el);
    el.querySelectorAll?.(".htsl-three").forEach(teardown);
  }
}

function build(el: Element, spec: ThreeSpec, THREE: ThreeNS, win: ThreeWindow): void {
  const w = Math.max(1, spec.width);
  const h = Math.max(1, spec.height);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(spec.background);

  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
  camera.position.z = 6;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  el.textContent = "";
  el.appendChild(renderer.domElement as Node);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const light = new THREE.PointLight(0xffffff, 2);
  light.position.set(5, 5, 5);
  scene.add(light);

  const animated: Array<ThreeObject & { mesh: any; angle: number }> = [];
  for (const o of spec.objects) {
    const geo =
      o.shape === "box"
        ? new THREE.BoxGeometry(o.size, o.size, o.size)
        : new THREE.SphereGeometry(o.size, 32, 24);
    const mat = o.glow
      ? new THREE.MeshBasicMaterial({ color: o.color })
      : new THREE.MeshStandardMaterial({ color: o.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(o.x, o.y, o.z);
    scene.add(mesh);
    if (o.spin || o.orbit) animated.push({ ...o, mesh, angle: 0 });
  }

  let raf = 0;
  let alive = true;
  const tick = (): void => {
    if (!alive) return;
    for (const a of animated) {
      if (a.spin) a.mesh.rotation.y += a.spin;
      if (a.orbit) {
        a.angle += a.speed;
        a.mesh.position.x = Math.cos(a.angle) * a.orbit;
        a.mesh.position.z = Math.sin(a.angle) * a.orbit;
      }
    }
    renderer.render(scene, camera);
    raf = win.requestAnimationFrame(tick);
  };
  raf = win.requestAnimationFrame(tick);

  (el as any)[SLOT] = {
    stop: () => {
      alive = false;
      win.cancelAnimationFrame(raf);
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
