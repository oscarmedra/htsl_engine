import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

// D1/D2 — wide tables scroll horizontally (wrapped) instead of overflowing.
describe("D1/D2 — wide content scrolls horizontally", () => {
  it("wraps a plain table in a horizontal-scroll container", () => {
    const html = compile("{table:{tr:{td:a}{td:b}}}");
    expect(html).toContain('<div class="htsl-scroll-x">');
    expect(html).toContain("<table>");
  });

  it("wraps a {@truthtable} too", () => {
    expect(compile("{@truthtable:{head:P,Q}{row:V,F}}")).toContain(
      '<div class="htsl-scroll-x"><table class="htsl-truthtable">',
    );
  });

  it("does not wrap non-table elements", () => {
    expect(compile("{p:x}")).toBe("<p>x</p>");
  });
});

// B1 (quick wins) — forced page break.
describe("B1 — forced page break", () => {
  it("{@pagebreak} emits a break element", () => {
    expect(compile("{p:a}{@pagebreak/}{p:b}")).toContain('<div class="htsl-pagebreak"');
  });
  it("supports the alias {@saut}", () => {
    expect(compile("{@saut/}")).toContain("htsl-pagebreak");
  });
});
