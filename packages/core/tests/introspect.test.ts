import { describe, expect, it } from "vitest";
import { registry, parse } from "../src/index.js";

describe("registry.list", () => {
  it("lists registered objects with paths, aliases and kind", () => {
    const list = registry.list();
    const paths = list.map((e) => e.path);
    expect(paths).toContain("math.text.inline");
    expect(paths).toContain("math.geometry.3d.sphere");
    expect(paths).toContain("math.geometry.2d.frame");
    for (const e of list) {
      expect(e.kind).toBe("object");
      expect(typeof e.description).toBe("string");
      expect(Array.isArray(e.aliases)).toBe(true);
    }
  });

  it("exposes both flat and collection-prefixed aliases", () => {
    const frame = registry.list().find((e) => e.path === "math.geometry.2d.frame");
    expect(frame?.aliases).toContain("repere"); // flat
    expect(frame?.aliases).toContain("mg2.frame"); // collection-prefixed
    const inline = registry.list().find((e) => e.path === "math.text.inline");
    expect(inline?.aliases).toContain("mti");
    expect(inline?.aliases).toContain("mt.inline");
  });
});

describe("registry.describe", () => {
  it("describes by canonical path", () => {
    const m = registry.describe("math.text.equation");
    expect(m).not.toBeNull();
    expect(m!.contentModel).toBe("math");
    expect(m!.example).toContain("{@mte");
    const label = m!.attrs.find((a) => a.name === "label");
    expect(label?.required).toBe(false);
  });

  it("describes by flat alias and by collection alias identically", () => {
    const byAlias = registry.describe("mte");
    const byCollection = registry.describe("mt.equation");
    const byPath = registry.describe("math.text.equation");
    expect(byAlias?.path).toBe("math.text.equation");
    expect(byCollection?.path).toBe("math.text.equation");
    expect(byPath?.path).toBe("math.text.equation");
  });

  it("describes the French alias `repere`", () => {
    expect(registry.describe("repere")?.path).toBe("math.geometry.2d.frame");
  });

  it("captures required attributes and defaults", () => {
    const ref = registry.describe("mtr")!;
    expect(ref.attrs.find((a) => a.name === "to")?.required).toBe(true);

    const sphere = registry.describe("mg3.sphere")!;
    const radius = sphere.attrs.find((a) => a.name === "radius");
    expect(radius?.type).toBe("number");
    expect(radius?.default).toBe("1");

    const frame = registry.describe("mg2.frame")!;
    expect(frame.attrs.find((a) => a.name === "equal")?.default).toBe("true");
    const type = frame.attrs.find((a) => a.name === "type");
    expect(type?.type).toBe("enum");
    expect(type?.values).toContain("complex");
  });

  it("returns null for an unknown path", () => {
    expect(registry.describe("nope.unknown")).toBeNull();
  });

  it("documents every collection (no object left without metadata)", () => {
    for (const path of [
      "math.text.inline",
      "math.text.block",
      "math.text.equation",
      "math.text.ref",
      "math.text.align",
      "math.text.cases",
      "math.text.system",
      "math.object.fraction",
      "math.constant.pi",
      "math.geometry.2d.scene",
      "math.geometry.2d.frame",
      "math.geometry.2d.cpoint",
      "math.geometry.3d.scene",
      "math.geometry.3d.space",
      "math.geometry.3d.plane",
      "math.geometry.3d.sphere",
    ]) {
      const m = registry.describe(path);
      expect(m, path).not.toBeNull();
      expect(m!.description.length, path).toBeGreaterThan(0);
      expect(m!.example.length, path).toBeGreaterThan(0);
    }
  });
});

describe("document introspection", () => {
  it("lists components defined with {!define} and their parameters", () => {
    const ast = parse(`{!define card[title, color=indigo]:{div:{$title}{$children}}}{@card[title=x]:y}`);
    const comps = registry.components(ast);
    expect(comps).toHaveLength(1);
    expect(comps[0]!.name).toBe("card");
    expect(comps[0]!.params).toEqual([
      { name: "title", default: null },
      { name: "color", default: "indigo" },
    ]);
  });

  it("lists variables defined with {!set}", () => {
    const ast = parse(`{!set theme: indigo}{!set size: 4}{p:{$theme}}`);
    expect(registry.variables(ast).sort()).toEqual(["size", "theme"]);
  });

  it("finds components even when defined after use (whole-document walk)", () => {
    const ast = parse(`{@box/}{!define box:{div:x}}`);
    expect(registry.components(ast).map((c) => c.name)).toContain("box");
  });
});
