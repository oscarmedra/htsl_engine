import { describe, expect, it } from "vitest";
import { compile, parse, sceneSpec, parseComplex } from "../src/index.js";
import { HTSLError } from "../src/errors.js";
import type { ObjectNode } from "../src/index.js";

function scene(src: string): ObjectNode {
  const node = parse(src)[0];
  if (!node || node.type !== "object") throw new Error("expected a scene object");
  return node;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const xaxis = (s: ReturnType<typeof sceneSpec>): any => s.layout["xaxis"];
const yaxis = (s: ReturnType<typeof sceneSpec>): any => s.layout["yaxis"];
const scene3 = (s: ReturnType<typeof sceneSpec>): any => s.layout["scene"];

describe("parseComplex", () => {
  it("parses every affix form, including negatives and decimals", () => {
    expect(parseComplex("3+2i")).toEqual([3, 2]);
    expect(parseComplex("3-2i")).toEqual([3, -2]);
    expect(parseComplex("2i")).toEqual([0, 2]);
    expect(parseComplex("-2i")).toEqual([0, -2]);
    expect(parseComplex("i")).toEqual([0, 1]);
    expect(parseComplex("-i")).toEqual([0, -1]);
    expect(parseComplex("3")).toEqual([3, 0]);
    expect(parseComplex("-3+i")).toEqual([-3, 1]);
    expect(parseComplex("0.5-1.5i")).toEqual([0.5, -1.5]);
  });
});

describe("2D frame (repère) layout", () => {
  it("applies ranges, ticks and grid, and is orthonormal by default (scaleanchor)", () => {
    const s = sceneSpec(
      scene(`{@mg2.scene:{@mg2.frame[xrange="(-4,4)", yrange="(-3,3)", grid=true, ticks=1]/}}`),
    );
    expect(xaxis(s).range).toEqual([-4, 4]);
    expect(yaxis(s).range).toEqual([-3, 3]);
    expect(xaxis(s).dtick).toBe(1);
    expect(xaxis(s).showgrid).toBe(true);
    expect(xaxis(s).scaleanchor).toBe("y"); // equal defaults to true
  });

  it("drops the orthonormal constraint when equal=false", () => {
    const s = sceneSpec(scene(`{@mg2.scene:{@mg2.frame[equal=false]/}}`));
    expect(xaxis(s).scaleanchor).toBeUndefined();
  });

  it("hides the grid when grid=false", () => {
    const s = sceneSpec(scene(`{@mg2.scene:{@mg2.frame[grid=false]/}}`));
    expect(xaxis(s).showgrid).toBe(false);
  });

  it("uses custom axis labels", () => {
    const s = sceneSpec(scene(`{@mg2.scene:{@mg2.frame[labels="t,v"]/}}`));
    expect(xaxis(s).title).toEqual({ text: "t" });
    expect(yaxis(s).title).toEqual({ text: "v" });
  });

  it("works with the French alias `repere`", () => {
    const s = sceneSpec(scene(`{@mg2.scene:{@repere[ticks=2]/}}`));
    expect(xaxis(s).dtick).toBe(2);
  });
});

describe("complex plane frame", () => {
  it("labels axes Re(z) / Im(z) and ranges from `range`", () => {
    const s = sceneSpec(scene(`{@mg2.scene:{@mg2.frame[type=complex, range=4]/}}`));
    expect(xaxis(s).title).toEqual({ text: "Re(z)" });
    expect(yaxis(s).title).toEqual({ text: "Im(z)" });
    expect(xaxis(s).range).toEqual([-4, 4]);
    expect(xaxis(s).scaleanchor).toBe("y");
  });

  it("adds a dashed unit circle when unitcircle=true", () => {
    const s = sceneSpec(scene(`{@mg2.scene:{@mg2.frame[type=complex, unitcircle=true]/}}`));
    const circle = s.data[0] as any;
    expect(circle.name).toBe("|z| = 1");
    expect(circle.line.dash).toBe("dot");
  });

  it("places a complex point at its affix", () => {
    const s = sceneSpec(
      scene(`{@mg2.scene:{@mg2.cpoint[z="3+2i", name=A]/}{@mg2.cpoint[z="-1-2i", name=B]/}}`),
    );
    const a = s.data[0] as any;
    const b = s.data[1] as any;
    expect([a.x[0], a.y[0]]).toEqual([3, 2]);
    expect([b.x[0], b.y[0]]).toEqual([-1, -2]);
    expect(a.text).toEqual(["A"]);
  });
});

describe("3D space layout", () => {
  it("applies ranges, ticks, labels and equal aspect", () => {
    const s = sceneSpec(
      scene(`{@mg3.scene:{@mg3.space[xrange="(-5,5)", ticks=2, equal=true, labels="x,y,z"]/}}`),
    );
    expect(scene3(s).aspectmode).toBe("data");
    expect(scene3(s).xaxis.range).toEqual([-5, 5]);
    expect(scene3(s).xaxis.dtick).toBe(2);
    expect(scene3(s).zaxis.title).toEqual({ text: "z" });
  });

  it("uses non-data aspect when equal=false", () => {
    const s = sceneSpec(scene(`{@mg3.scene:{@mg3.space[equal=false]/}}`));
    expect(scene3(s).aspectmode).toBe("auto");
  });
});

describe("décor / actor rules", () => {
  it("keeps current defaults when there is no frame (no regression)", () => {
    const s = sceneSpec(scene(`{@mg2.scene:{@mg2.circle[center="(0,0)", radius=3]/}}`));
    expect(xaxis(s).scaleanchor).toBe("y");
    expect(Array.isArray(xaxis(s).range)).toBe(true);
  });

  it("accounts for the frame wherever it sits among the children", () => {
    const s = sceneSpec(
      scene(`{@mg2.scene:{@mg2.circle[center="(0,0)", radius=1]/}{@mg2.frame[ticks=5]/}}`),
    );
    expect(xaxis(s).dtick).toBe(5);
  });

  it("errors (localized) when a scene has two frames", () => {
    try {
      compile(`{@mg2.scene:{@mg2.frame[range=4]/}{@mg2.frame[range=2]/}}`);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HTSLError);
      expect((err as HTSLError).message).toContain("un seul repère");
      expect(typeof (err as HTSLError).line).toBe("number");
    }
  });

  it("errors when a 3D scene has two spaces", () => {
    expect(() => compile(`{@mg3.scene:{@mg3.space/}{@mg3.space/}}`)).toThrow(
      /un seul repère/,
    );
  });
});

describe("frame / space / cpoint outside a scene → LaTeX", () => {
  it("renders a repère notation for a frame", () => {
    expect(compile(`{@mg2.frame/}`)).toContain("\\vec{\\imath}");
  });
  it("renders a 3D repère notation for a space", () => {
    expect(compile(`{@mg3.space/}`)).toContain("\\vec{k}");
  });
  it("renders the affix for a cpoint", () => {
    expect(compile(`{@mg2.cpoint[z="3-2i", name=A]/}`)).toContain("A(3 - 2i)");
  });
});
