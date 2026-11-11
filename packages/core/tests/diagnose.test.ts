import { describe, expect, it } from "vitest";
import katex from "katex";
import { diagnose } from "../src/index.js";

describe("diagnose — A4 unknown objects", () => {
  it("flags an unknown object with line/col and suggests the element form", () => {
    const [d] = diagnose("{@table:x}");
    expect(d?.severity).toBe("error");
    expect(d?.line).toBe(1);
    expect(d?.message).toContain("objet inconnu {@table}");
    expect(d?.suggestion).toContain("{table}");
  });

  it("suggests the closest object for a typo", () => {
    const [d] = diagnose("{@truthtabl:x}");
    expect(d?.suggestion).toBe("{@truthtable}");
  });

  it("does not flag known objects", () => {
    expect(diagnose("{@document:{@document.page:{p:a}}}")).toEqual([]);
  });

  it("does not flag a user-defined component", () => {
    expect(diagnose("{!define carte[]: {div:{$children}}}\n{@carte: salut}")).toEqual([]);
  });

  it("reports the correct line for an object deeper in the file", () => {
    const [d] = diagnose("{p:ok}\n{p:ok}\n{@nope:x}");
    expect(d?.line).toBe(3);
  });
});

describe("diagnose — A5 formula validation (with KaTeX)", () => {
  it("flags an invalid formula with the KaTeX message", () => {
    const [d] = diagnose("{p:$\\frac{a}$}", { katex });
    expect(d?.message).toContain("formule invalide");
    expect(d?.line).toBe(1);
  });

  it("passes valid formulas", () => {
    expect(diagnose("{p:$x^2 + 1$ et $\\frac{a}{b}$}", { katex })).toEqual([]);
  });

  it("does not validate formulas without a katex implementation", () => {
    expect(diagnose("{p:$\\foobar$}")).toEqual([]);
  });

  it("locates the faulty formula among several", () => {
    const ds = diagnose("{p:$x$ puis $\\notacommand$}", { katex });
    expect(ds).toHaveLength(1);
    expect(ds[0]?.col).toBeGreaterThan(5);
  });
});
