import { describe, expect, it } from "vitest";
import { objectsSchema } from "../src/index.js";

// E3 — a complete, JSON-serialisable schema of every object/element.
describe("objectsSchema — reference schema", () => {
  it("lists every registered object with its full attribute schema", () => {
    const schema = objectsSchema();
    expect(schema.length).toBeGreaterThan(100);
    const doc = schema.find((e) => e.path === "document");
    expect(doc).toBeTruthy();
    expect(doc?.attrs.map((a) => a.name)).toContain("format");
    const pdf = schema.find((e) => e.path === "pdf");
    expect(pdf?.attrs.find((a) => a.name === "src")?.required).toBe(true);
  });

  it("is JSON-serialisable (usable by tools / AI)", () => {
    expect(() => JSON.stringify(objectsSchema())).not.toThrow();
  });

  it("is sorted by path", () => {
    const paths = objectsSchema().map((e) => e.path);
    expect(paths).toEqual([...paths].sort((a, b) => a.localeCompare(b)));
  });
});
