import { describe, expect, it, vi } from "vitest";
import { loadDependency, hydrate, purge } from "../src/index.js";

/* -------------------------------------------------------------------------- */
/* Minimal fake DOM (the runtime only touches a handful of methods)           */
/* -------------------------------------------------------------------------- */

interface Sel {
  tag?: string;
  cls?: string;
  attr?: string;
  attrVal?: string;
}
function parseSel(sel: string): Sel {
  const out: Sel = {};
  const attr = /\[([\w-]+)(?:="([^"]*)")?\]/.exec(sel);
  if (attr) {
    out.attr = attr[1];
    if (attr[2] !== undefined) out.attrVal = attr[2];
  }
  const base = sel.replace(/\[[^\]]*\]/g, ""); // drop attribute parts (may contain dots)
  const tag = /^([a-z][\w-]*)/i.exec(base);
  if (tag) out.tag = tag[1]!.toUpperCase();
  const cls = /\.([\w-]+)/.exec(base);
  if (cls) out.cls = cls[1];
  return out;
}

class El {
  tagName: string;
  children: El[] = [];
  textContent = "";
  src = "";
  async = false;
  private readonly a = new Map<string, string>();
  private readonly listeners: Record<string, Array<() => void>> = {};
  readonly classList = {
    contains: (c: string) => (this.a.get("class") ?? "").split(/\s+/).includes(c),
  };
  constructor(tag: string, attrs: Record<string, string> = {}) {
    this.tagName = tag.toUpperCase();
    for (const [k, v] of Object.entries(attrs)) this.a.set(k, v);
  }
  getAttribute(k: string): string | null {
    if (k === "src" && this.src) return this.src;
    return this.a.has(k) ? this.a.get(k)! : null;
  }
  setAttribute(k: string, v: string): void {
    if (k === "src") this.src = v;
    this.a.set(k, v);
  }
  hasAttribute(k: string): boolean {
    return this.a.has(k);
  }
  get attributes(): Array<{ name: string; value: string }> {
    return [...this.a].map(([name, value]) => ({ name, value }));
  }
  addEventListener(ev: string, fn: () => void): void {
    (this.listeners[ev] ??= []).push(fn);
  }
  fire(ev: string): void {
    (this.listeners[ev] ?? []).forEach((f) => f());
  }
  appendChild(c: El): El {
    this.children.push(c);
    if (c.tagName === "SCRIPT") queueMicrotask(() => c.fire("load")); // simulate load
    return c;
  }
  private descendants(): El[] {
    const out: El[] = [];
    const walk = (n: El): void => n.children.forEach((c) => (out.push(c), walk(c)));
    walk(this);
    return out;
  }
  private matches(s: Sel): boolean {
    if (s.tag && this.tagName !== s.tag) return false;
    if (s.cls && !this.classList.contains(s.cls)) return false;
    if (s.attr) {
      const v = this.getAttribute(s.attr);
      if (v === null) return false;
      if (s.attrVal !== undefined && v !== s.attrVal) return false;
    }
    return true;
  }
  querySelectorAll(sel: string): El[] {
    const s = parseSel(sel);
    return this.descendants().filter((d) => d.matches(s));
  }
  querySelector(sel: string): El | null {
    return this.querySelectorAll(sel)[0] ?? null;
  }
}

function makeWindow(): { window: { document: El & { head: El; createElement: (t: string) => El; readyState: string }; Plotly?: unknown } } {
  const head = new El("head");
  const body = new El("body");
  const doc = new El("html") as El & { head: El; createElement: (t: string) => El; readyState: string };
  doc.children.push(head, body);
  doc.head = head;
  doc.createElement = (t: string) => new El(t);
  doc.readyState = "complete";
  const window = { document: doc };
  return { window } as never;
}

function scene(spec: object, hash: string): El {
  return new El("div", {
    class: "htsl-scene htsl-scene--2d",
    "data-htsl-scene": JSON.stringify(spec),
    "data-htsl-hash": hash,
  });
}

function fakePlotly() {
  const calls = { newPlot: 0, react: 0, purge: 0 };
  const Plotly = {
    newPlot: (el: El) => {
      calls.newPlot++;
      el.children.push(new El("div", { class: "js-plotly-plot" }));
    },
    react: (_el: El) => {
      calls.react++;
    },
    purge: (_el: El) => {
      calls.purge++;
    },
  };
  return { Plotly, calls };
}

/* -------------------------------------------------------------------------- */

describe("runtime: loadDependency", () => {
  it("caches by URL — one load, one shared Promise, no race", async () => {
    const w = makeWindow().window as never as { document: El & { head: El } };
    const p1 = loadDependency("https://x/dep.js", w as never);
    const p2 = loadDependency("https://x/dep.js", w as never);
    expect(p1).toBe(p2); // same cached promise
    await p1;
    const scripts = (w.document.head as El).querySelectorAll('script[data-htsl-dep="https://x/dep.js"]');
    expect(scripts).toHaveLength(1); // appended exactly once
    // A third call after resolution is still the same cached promise.
    expect(loadDependency("https://x/dep.js", w as never)).toBe(p1);
  });
});

describe("runtime: hydrate", () => {
  it("draws a pending scene once, then is idempotent (unchanged → nothing)", async () => {
    const { window } = makeWindow();
    const { Plotly, calls } = fakePlotly();
    (window as { Plotly?: unknown }).Plotly = Plotly;
    const root = new El("div");
    root.children.push(scene({ data: [], layout: {} }, "h1"));

    expect(await hydrate(root as never, window as never)).toBe(1);
    expect(calls.newPlot).toBe(1);

    // Second hydrate with no change → strictly nothing.
    expect(await hydrate(root as never, window as never)).toBe(0);
    expect(calls.newPlot).toBe(1);
    expect(calls.react).toBe(0);
  });

  it("updates a scene with Plotly.react when its hash changes (never newPlot)", async () => {
    const { window } = makeWindow();
    const { Plotly, calls } = fakePlotly();
    (window as { Plotly?: unknown }).Plotly = Plotly;
    const root = new El("div");
    const s = scene({ data: [], layout: {} }, "h1");
    root.children.push(s);

    await hydrate(root as never, window as never);
    expect(calls.newPlot).toBe(1);

    // Change the description hash → react, not a destroy + newPlot.
    s.setAttribute("data-htsl-hash", "h2");
    s.setAttribute("data-htsl-scene", JSON.stringify({ data: [{ x: 1 }], layout: {} }));
    expect(await hydrate(root as never, window as never)).toBe(1);
    expect(calls.react).toBe(1);
    expect(calls.newPlot).toBe(1); // unchanged
  });

  it("loads no dependency when there is nothing to hydrate", async () => {
    const { window } = makeWindow();
    const head = (window.document as El & { head: El }).head;
    const spy = vi.spyOn(head, "appendChild");
    const root = new El("div"); // no scenes
    expect(await hydrate(root as never, window as never)).toBe(0);
    expect(spy).not.toHaveBeenCalled(); // Plotly never requested
  });
});

describe("runtime: purge", () => {
  it("purges Plotly resources of a removed scene", async () => {
    const { window } = makeWindow();
    const { Plotly, calls } = fakePlotly();
    (window as { Plotly?: unknown }).Plotly = Plotly;
    const root = new El("div");
    const s = scene({ data: [], layout: {} }, "h1");
    root.children.push(s);
    await hydrate(root as never, window as never); // draw it (sets data-htsl-init)

    purge([s as never], window as never);
    expect(calls.purge).toBe(1);
  });
});
