import { describe, expect, it } from "vitest";
import { compile, isVariationsPath } from "../src/index.js";

const arrows = (html: string): string[] =>
  [...html.matchAll(/htsl-vt-arrow[^>]*>([^<]*)</g)].map((m) => m[1]!.trim());
const positions = (html: string): string[] =>
  [...html.matchAll(/htsl-vt-val htsl-vt-(top|bottom)/g)].map((m) => m[1]!);
const signs = (html: string): string[] =>
  [...html.matchAll(/htsl-vt-sign[^>]*>([^<]*)</g)].map((m) => m[1]!.trim());

describe("{@variations}", () => {
  it("recognises the variation/sign paths", () => {
    expect(isVariationsPath("variations")).toBe(true);
    expect(isVariationsPath("signs")).toBe(true);
    expect(isVariationsPath("chart")).toBe(false);
  });

  it("renders a CSS-grid table with arrows derived from {up}/{down}", () => {
    const html = compile(
      '{@variations: {pt[x="-\\infty", y="2"]/} {down/} {pt[x="0", y="-3"]/} {up/} {pt[x="2", y="1"]/}}',
    );
    expect(html).toContain("htsl-vt-grid");
    expect(arrows(html)).toEqual(["↘", "↗"]);
    expect(html).not.toContain("<script>");
  });

  it("derives top/bottom positions from the surrounding arrows", () => {
    // down then up → start at a max (top), min (bottom), back to top
    const html = compile('{@variations: {pt[x="a", y="1"]/} {down/} {pt[x="b", y="0"]/} {up/} {pt[x="c", y="1"]/}}');
    expect(positions(html)).toEqual(["top", "bottom", "top"]);
  });
});

describe("{@signs}", () => {
  it("renders signs in the segments and a 0 at a root (zero=true)", () => {
    const html = compile('{@signs: {pt[x="-\\infty"]/} {s: -} {pt[x="2", zero=true]/} {s: +} {pt[x="+\\infty"]/}}');
    // empty, minus (−), zero, plus, empty
    expect(signs(html)).toEqual(["", "−", "0", "+", ""]);
  });
});
