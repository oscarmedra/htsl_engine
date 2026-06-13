import { describe, expect, it } from "vitest";
import { compileExpr, safeExpr } from "../src/objects/expr.js";

const ev = (src: string, scope: Record<string, number> = {}) => compileExpr(src)(scope);

describe("safe math expression evaluator", () => {
  it("respects precedence and associativity", () => {
    expect(ev("2 + 3 * 4")).toBe(14);
    expect(ev("(2 + 3) * 4")).toBe(20);
    expect(ev("2 ^ 3 ^ 2")).toBe(512); // right-assoc
    expect(ev("-2 ^ 2")).toBe(-4); // ^ binds tighter than unary minus
    expect(ev("2 ^ -2")).toBe(0.25);
    expect(ev("3 * -2")).toBe(-6);
  });

  it("evaluates variables, constants and functions", () => {
    expect(ev("x^2 + y^2", { x: 3, y: 4 })).toBe(25);
    expect(ev("cos(pi)")).toBeCloseTo(-1);
    expect(ev("sin(pi/2)")).toBeCloseTo(1);
    expect(ev("sqrt(x)", { x: 9 })).toBe(3);
    expect(ev("max(1, 7, 3)")).toBe(7);
    expect(ev("mod(-1, 3)")).toBe(2);
    expect(ev("e^1")).toBeCloseTo(Math.E);
  });

  it("compiles once and re-evaluates cheaply for many points", () => {
    const f = compileExpr("sin(x) * cos(y)");
    expect(f({ x: 0, y: 0 })).toBeCloseTo(0);
    expect(f({ x: Math.PI / 2, y: 0 })).toBeCloseTo(1);
  });

  it("is safe: no access to globals, throws on garbage", () => {
    expect(() => compileExpr("window")).not.toThrow(); // unknown id → variable (0)
    expect(ev("window")).toBe(0);
    expect(() => compileExpr("1 +")).toThrow();
    expect(() => compileExpr("foo(1)")).toThrow(); // unknown function
  });

  it("safeExpr never throws (bad formula → 0)", () => {
    expect(safeExpr("1 + ")({})).toBe(0);
    expect(safeExpr(undefined)({})).toBe(0);
    expect(safeExpr("2*x")({ x: 5 })).toBe(10);
  });
});
