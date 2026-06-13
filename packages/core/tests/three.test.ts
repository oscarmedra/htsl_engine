import { describe, expect, it } from "vitest";
import { compile, parse, threeSpec, isThreePath, registry } from "../src/index.js";
import type { ObjectNode } from "../src/types.js";

const sceneSrc = `{@s3.scene[height=480, background="#000000"]:
  {@s3.sphere[radius=0.8, color="#facc15", glow=true, spin=0.003]/}
  {@s3.sphere[radius=0.3, color="#60a5fa", orbit=3, speed=0.02]/}
  {@s3.box[size=1, color="#f472b6", x=2]/}
}`;

describe("declarative 3D scenes (Three.js) — engine", () => {
  it("renders a data node, never a <script>", () => {
    const html = compile(sceneSrc, { hashBlocks: true });
    expect(html).toContain('class="htsl-three"');
    expect(html).toContain("data-htsl-three=");
    expect(html).toContain("data-htsl-hash=");
    expect(html).not.toContain("<script");
  });

  it("collects actors into a pure JSON spec (positions, animation, glow)", () => {
    const scene = parse(sceneSrc)[0] as ObjectNode;
    const spec = threeSpec(scene);
    expect(spec).toMatchObject({ width: 600, height: 480, background: "#000000" });
    expect(spec.objects).toHaveLength(3);
    expect(spec.objects[0]).toMatchObject({ shape: "sphere", size: 0.8, glow: true, spin: 0.003 });
    expect(spec.objects[1]).toMatchObject({ shape: "sphere", orbit: 3, speed: 0.02, glow: false });
    expect(spec.objects[2]).toMatchObject({ shape: "box", size: 1, x: 2 });
  });

  it("uses sensible defaults for missing attributes", () => {
    const scene = parse(`{@s3.scene:{@s3.sphere/}}`)[0] as ObjectNode;
    const spec = threeSpec(scene);
    expect(spec).toMatchObject({ width: 600, height: 400, background: "#020617" });
    expect(spec.objects[0]).toMatchObject({ size: 0.5, x: 0, y: 0, z: 0, spin: 0, orbit: 0, speed: 0 });
  });

  it("classifies scene.3d.* paths and resolves the s3 alias", () => {
    expect(isThreePath("scene.3d.scene")).toBe(true);
    expect(isThreePath("math.geometry.3d.scene")).toBe(false);
    expect(registry.describe("s3.scene")?.path).toBe("scene.3d.scene");
    expect(registry.describe("s3.sphere")?.path).toBe("scene.3d.sphere");
  });

  it("is listed under the géométrie category / Scènes (path ends .scene)", () => {
    const paths = registry.list().map((e) => e.path);
    expect(paths).toContain("scene.3d.scene");
    expect(paths).toContain("scene.3d.sphere");
    expect(paths).toContain("scene.3d.box");
  });

  it("supports vectors, lines, axes, grid and more shapes", () => {
    const src = `{@s3.scene[controls=true, autorotate=true, distance=8]:
      {@s3.axes[size=3]/}
      {@s3.grid[size=10, divisions=20]/}
      {@s3.torus[radius=1, tube=0.3]/}
      {@s3.cylinder[radius=0.5, height=2]/}
      {@s3.cone[radius=0.5, height=1]/}
      {@s3.vector[from="(0,0,0)", to="(2,1,1)"]/}
      {@s3.line[points="(0,0,0);(1,1,0);(2,0,1)"]/}
    }`;
    const spec = threeSpec(parse(src)[0] as ObjectNode);
    expect(spec).toMatchObject({ controls: true, autorotate: true, distance: 8 });
    const byType = (t: string) => spec.objects.filter((o) => o.type === t);
    expect(byType("axes")).toHaveLength(1);
    expect(byType("grid")[0]).toMatchObject({ size: 10, divisions: 20 });
    expect(byType("vector")[0]).toMatchObject({ from: [0, 0, 0], to: [2, 1, 1] });
    expect(byType("line")[0]?.points).toEqual([
      [0, 0, 0],
      [1, 1, 0],
      [2, 0, 1],
    ]);
    expect(spec.objects.map((o) => o.shape)).toEqual(
      expect.arrayContaining(["torus", "cylinder", "cone"]),
    );
  });

  it("exposes the s3 objects via introspection (examples all compile)", () => {
    const s3 = registry.list().filter((e) => e.path.startsWith("scene.3d."));
    expect(s3.length).toBeGreaterThanOrEqual(13);
    for (const e of s3) expect(() => compile(e.example)).not.toThrow();
  });

  it("samples a surface z=f(x,y) into a height grid", () => {
    const src = `{@s3.scene:{@s3.surface[z="x*x + y*y", xrange="(-2,2)", yrange="(-2,2)", res=5]/}}`;
    const o = threeSpec(parse(src)[0] as ObjectNode).objects[0]!;
    expect(o.type).toBe("surface");
    expect(o.res).toBe(5);
    expect(o.heights).toHaveLength(25);
    expect(o.heights[0]).toBeCloseTo(8); // (-2)^2 + (-2)^2
    expect(o.heights[12]).toBeCloseTo(0); // centre (0,0)
  });

  it("samples a parametric curve (x(t),y(t),z(t)) into points", () => {
    const src = `{@s3.scene:{@s3.curve[x="cos(t)", y="sin(t)", z="0", trange="(0, 6.283185)", samples=60]/}}`;
    const o = threeSpec(parse(src)[0] as ObjectNode).objects[0]!;
    expect(o.type).toBe("line");
    expect(o.points).toHaveLength(60);
    expect(o.points[0]).toEqual([1, 0, 0]); // t=0 → (cos0, sin0, 0)
  });
});

describe("2D function plot {@plot}", () => {
  it("renders a declarative Plotly scene (sampled), no <script>", () => {
    const html = compile(`{@plot[fn="sin(x)/x", xrange="(-15,15)"]/}`, { hashBlocks: true });
    expect(html).toContain('class="htsl-scene htsl-scene--2d"');
    expect(html).toContain("scatter");
    expect(html).not.toContain("<script");
  });

  it("resolves the plot alias and lists the object", () => {
    expect(registry.describe("plot")?.path).toBe("math.plot.fn");
    expect(registry.list().map((e) => e.path)).toContain("math.plot.fn");
  });

  it("superimposes several curves with a legend", () => {
    const html = compile(
      `{@plot[xrange="(-6.28,6.28)"]:{@plot.curve[fn="sin(x)", label="sin"]/}{@plot.curve[fn="cos(x)", label="cos"]/}}`,
    );
    const spec = JSON.parse(html.match(/data-htsl-scene="([^"]*)"/)![1]!.replace(/&quot;/g, '"'));
    expect(spec.data).toHaveLength(2);
    expect(spec.data.map((d: { name: string }) => d.name)).toEqual(["sin", "cos"]);
    expect(spec.layout.showlegend).toBe(true);
  });
});

describe("3D animation timeline (s3.animate)", () => {
  it("collects animations by target id, with defaults and parsed targets", () => {
    const src = `{@s3.scene[loop=false]:
      {@s3.box[id="A"]/}
      {@s3.sphere[id="B", x=3]/}
      {@s3.animate[target="A", action="move", to="(2,2,0)", duration=2]/}
      {@s3.animate[target="A", action="rotate", axis="y", angle=180]/}
      {@s3.animate[target="A", action="transform", to="B", duration=2]/}
    }`;
    const spec = threeSpec(parse(src)[0] as ObjectNode);
    expect(spec.loop).toBe(false);
    expect(spec.objects.map((o) => o.id)).toEqual(["A", "B"]);
    expect(spec.animations).toHaveLength(3);
    expect(spec.animations[0]).toMatchObject({ target: "A", action: "move", to: [2, 2, 0], hasTo: true, duration: 2 });
    expect(spec.animations[1]).toMatchObject({ action: "rotate", axis: "y", angle: 180 });
    expect(spec.animations[2]).toMatchObject({ action: "transform", toId: "B", hasTo: false });
  });

  it("registers s3.animate and the id attribute", () => {
    expect(registry.describe("s3.animate")?.path).toBe("scene.3d.animate");
    const sphere = registry.describe("s3.sphere");
    expect(sphere?.attrs.some((a) => a.name === "id")).toBe(true);
  });
});

describe("3D labels (s3.label / label attr)", () => {
  it("renders a standalone label and a label attached to an actor", () => {
    const spec = threeSpec(
      parse(`{@s3.scene:{@s3.point[x=1, y=1, z=0, label="A"]/}{@s3.label[text="O", x=0, y=0, z=0]/}}`)[0] as ObjectNode,
    );
    const point = spec.objects.find((o) => o.type === "mesh");
    const label = spec.objects.find((o) => o.type === "label");
    expect(point?.label).toBe("A");
    expect(label?.text).toBe("O");
  });
});
