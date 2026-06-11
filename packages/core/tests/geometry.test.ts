import { describe, expect, it } from "vitest";
import { compile, parse, toPlotly, sceneSpec } from "../src/index.js";
import type { ObjectNode, Trace } from "../src/index.js";

function leaf(src: string): ObjectNode {
  const node = parse(src)[0];
  if (!node || node.type !== "object") throw new Error("expected an object node");
  return node;
}

function trace(src: string, i = 0): Trace {
  const t = toPlotly(leaf(src), src.includes("mg2") ? "2d" : "3d")[i];
  if (!t) throw new Error("no trace");
  return t;
}

describe("geometry — 3D traces", () => {
  it("point → scatter3d marker at the coordinates", () => {
    const t = trace("{@mg3.point[x=1,y=2,z=3,name=A,color=red]/}");
    expect(t["type"]).toBe("scatter3d");
    expect(t["x"]).toEqual([1]);
    expect(t["y"]).toEqual([2]);
    expect(t["z"]).toEqual([3]);
    expect(t["text"]).toEqual(["A"]);
    expect((t["marker"] as Record<string, unknown>)["color"]).toBe("red");
  });

  it("vector → a line plus a cone arrowhead", () => {
    const traces = toPlotly(leaf('{@mg3.vector[from="(1,2,3)",to="(1,3,4)"]/}'), "3d");
    expect(traces.map((t) => t["type"])).toEqual(["scatter3d", "cone"]);
    const cone = traces[1]!;
    expect(cone["x"]).toEqual([1]); // tip at "to"
    expect(cone["u"]).toEqual([0]); // direction = to - from
    expect(cone["v"]).toEqual([1]);
    expect(cone["w"]).toEqual([1]);
  });

  it("segment → a scatter3d line between endpoints", () => {
    const t = trace('{@mg3.segment[from="(0,0,0)",to="(1,1,1)"]/}');
    expect(t["type"]).toBe("scatter3d");
    expect(t["mode"]).toBe("lines");
    expect(t["x"]).toEqual([0, 1]);
  });

  it("line → an extended scatter3d line", () => {
    const t = trace('{@mg3.line[point="(0,0,0)",dir="(1,0,0)"]/}');
    expect(t["type"]).toBe("scatter3d");
    expect((t["x"] as number[]).length).toBe(2);
  });

  it("plane → a mesh3d surface with opacity", () => {
    const t = trace('{@mg3.plane[normal="(2,-1,3)",d=5,color=blue,opacity=0.5]/}');
    expect(t["type"]).toBe("mesh3d");
    expect(t["opacity"]).toBe(0.5);
    expect(t["color"]).toBe("blue");
    expect((t["x"] as number[]).length).toBe(4); // quad corners
  });

  it("sphere → a parametric surface", () => {
    const t = trace('{@mg3.sphere[center="(0,0,0)",radius=2]/}');
    expect(t["type"]).toBe("surface");
    const z = t["z"] as number[][];
    expect(Array.isArray(z)).toBe(true);
    expect(Array.isArray(z[0])).toBe(true); // 2D grid
  });
});

describe("geometry — 2D traces", () => {
  it("point → scatter marker", () => {
    const t = trace("{@mg2.point[x=1,y=2,name=A]/}");
    expect(t["type"]).toBe("scatter");
    expect(t["x"]).toEqual([1]);
    expect(t["y"]).toEqual([2]);
  });

  it("segment → scatter line", () => {
    const t = trace('{@mg2.segment[from="(0,0)",to="(3,4)"]/}');
    expect(t["type"]).toBe("scatter");
    expect(t["x"]).toEqual([0, 3]);
  });

  it("circle → closed scatter loop", () => {
    const t = trace('{@mg2.circle[center="(0,0)",radius=3]/}');
    expect(t["type"]).toBe("scatter");
    const x = t["x"] as number[];
    expect(x[0]).toBeCloseTo(3); // starts at radius on +x
    expect(x.length).toBeGreaterThan(10);
  });

  it("polygon → self-filled scatter, auto-closed", () => {
    const t = trace('{@mg2.polygon[points="(0,0);(2,0);(1,2)"]/}');
    expect(t["type"]).toBe("scatter");
    expect(t["fill"]).toBe("toself");
    const x = t["x"] as number[];
    expect(x[x.length - 1]).toBe(x[0]); // closed
  });

  it("droite → an extended scatter line", () => {
    const t = trace('{@mg2.droite[point="(0,0)",dir="(1,1)"]/}');
    expect(t["type"]).toBe("scatter");
    expect((t["x"] as number[]).length).toBe(2);
  });
});

describe("geometry — scene assembly", () => {
  it("collects child traces and builds a layout", () => {
    const scene = leaf(
      `{@mg3.scene[width=600,height=400]:` +
        `{@mg3.plane[normal="(2,-1,3)",d=5]/}` +
        `{@mg3.point[name=A,x=1,y=2,z=3]/}` +
        `{@mg3.vector[from="(1,2,3)",to="(1,3,4)"]/}` +
        `{@mg3.sphere[center="(0,0,0)",radius=2]/}}`,
    );
    const spec = sceneSpec(scene);
    expect(spec.data.length).toBe(5); // 1 + 1 + 2 + 1
    expect(spec.layout["width"]).toBe(600);
    expect(spec.layout["height"]).toBe(400);
    expect(spec.layout["scene"]).toBeDefined(); // 3D layout
  });

  it("uses a 2D layout for mg2 scenes", () => {
    const spec = sceneSpec(leaf(`{@mg2.scene:{@mg2.point[x=0,y=0]/}}`));
    expect(spec.layout["scene"]).toBeUndefined();
    expect(spec.layout["xaxis"]).toBeDefined();
  });
});

describe("geometry — context rule (scene vs LaTeX)", () => {
  it("renders a scene as a Plotly container div", () => {
    const html = compile(`{@mg2.scene:{@mg2.point[x=1,y=2]/}}`);
    expect(html).toContain('class="htsl-scene');
    expect(html).toContain("data-htsl-scene=");
  });

  it("renders a geometric object OUTSIDE a scene as its LaTeX notation", () => {
    expect(compile(`{@mg3.plane[normal="(2,-1,3)",d=5]/}`)).toContain("2x - y + 3z = 5");
    expect(compile(`{@mg3.point[x=1,y=2,z=3,name=A]/}`)).toContain("A(1, 2, 3)");
    expect(compile(`{@mg3.sphere[center="(0,0,0)",radius=2]/}`)).toContain(
      "^2 + (y )^2 + (z )^2 = 4",
    );
  });
});

describe("geometry — fallback without Plotly", () => {
  it("embeds the spec JSON and a fallback message", () => {
    const html = compile(`{@mg3.scene:{@mg3.sphere[center="(0,0,0)",radius=2]/}}`);
    expect(html).toContain("data-htsl-scene=");
    expect(html).toContain("Plotly requis");
    // The data attribute holds valid JSON (entities decoded).
    const m = html.match(/data-htsl-scene="([^"]*)"/);
    expect(m).not.toBeNull();
    const json = m![1]!.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    const spec = JSON.parse(json);
    expect(spec.data[0].type).toBe("surface");
  });
});
