import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";
import { mathCss } from "../src/objects/css.js";

const list = (type?: string) =>
  compile(`{ol${type ? `[type=${type}]` : ""}:{li:un}{li:deux}}`);

describe("{ol} marker types", () => {
  it("without `type` renders exactly as before (no class, unchanged HTML)", () => {
    expect(list()).toBe("<ol><li>un</li><li>deux</li></ol>");
  });

  it("type=num is the default → identical to no type (no class)", () => {
    expect(list("num")).toBe("<ol><li>un</li><li>deux</li></ol>");
  });

  it("type=alpha → (a) (b) marker class", () => {
    expect(list("alpha")).toBe('<ol class="htsl-ol-alpha"><li>un</li><li>deux</li></ol>');
  });

  it("type=Alpha → (A) (B) marker class", () => {
    expect(list("Alpha")).toBe('<ol class="htsl-ol-alpha-upper"><li>un</li><li>deux</li></ol>');
  });

  it("type=roman → (i) (ii) marker class", () => {
    expect(list("roman")).toBe('<ol class="htsl-ol-roman"><li>un</li><li>deux</li></ol>');
  });

  it("type=Roman → (I) (II) marker class", () => {
    expect(list("Roman")).toBe('<ol class="htsl-ol-roman-upper"><li>un</li><li>deux</li></ol>');
  });

  it("type=paren → 1) 2) marker class", () => {
    expect(list("paren")).toBe('<ol class="htsl-ol-paren"><li>un</li><li>deux</li></ol>');
  });

  it("unknown type falls back to default (no class, no error)", () => {
    expect(list("wat")).toBe("<ol><li>un</li><li>deux</li></ol>");
  });

  it("never emits `type` as a raw HTML attribute", () => {
    expect(list("alpha")).not.toContain("type=");
    expect(list("num")).not.toContain("type=");
    expect(list("wat")).not.toContain("type=");
  });

  it("merges the marker class with author-supplied classes", () => {
    expect(compile(`{ol.mine[type=roman]:{li:x}}`)).toBe(
      '<ol class="mine htsl-ol-roman"><li>x</li></ol>',
    );
  });

  it("ships CSS rules for every marker variant with custom counters", () => {
    for (const cls of [
      "htsl-ol-alpha",
      "htsl-ol-alpha-upper",
      "htsl-ol-roman",
      "htsl-ol-roman-upper",
      "htsl-ol-paren",
    ]) {
      expect(mathCss).toContain(`.${cls}`);
    }
    expect(mathCss).toContain("counter(htsl-ol, lower-alpha)");
    expect(mathCss).toContain("counter(htsl-ol, decimal)");
  });
});
