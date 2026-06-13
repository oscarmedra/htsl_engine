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

  it("exposes ~12 s3 objects via introspection", () => {
    const s3 = registry.list().filter((e) => e.path.startsWith("scene.3d."));
    expect(s3.length).toBeGreaterThanOrEqual(11);
    // every example must compile (palette previews never throw)
    for (const e of s3) expect(() => compile(e.example)).not.toThrow();
  });
});
