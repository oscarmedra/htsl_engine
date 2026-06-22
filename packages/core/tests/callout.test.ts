import { describe, expect, it } from "vitest";
import { compile, isCalloutPath } from "../src/index.js";

const heads = (html: string): string[] =>
  [...html.matchAll(/htsl-callout-head">([^<]*)</g)].map((m) => m[1] as string);

describe("semantic callouts", () => {
  it("recognises callout paths", () => {
    expect(isCalloutPath("callout.theorem")).toBe(true);
    expect(isCalloutPath("callout.ref")).toBe(false); // ref is not a box
    expect(isCalloutPath("math.text.block")).toBe(false);
  });

  it("renders a styled box with a tone class and a header", () => {
    const html = compile("{@theorem: {p:énoncé}}");
    expect(html).toContain("htsl-callout htsl-callout-theorem");
    expect(html).toContain('class="htsl-callout-head">Théorème 1<');
    expect(html).toContain("<p>énoncé</p>");
  });

  it("numbers each type independently", () => {
    const html = compile("{@theorem:A}{@definition:B}{@theorem:C}{@example:D}");
    expect(heads(html)).toEqual(["Théorème 1", "Définition 1", "Théorème 2", "Exemple 1"]);
  });

  it("appends an optional title after the number", () => {
    const html = compile('{@theorem[title="Pythagore"]: x}');
    expect(heads(html)).toEqual(["Théorème 1 — Pythagore"]);
  });

  it("does not number proof / remark / warning", () => {
    const html = compile("{@proof:p}{@remark:r}{@warning:w}");
    expect(heads(html)).toEqual(["Démonstration", "Remarque", "Attention"]);
  });

  it("links {@ref[to=…]/} to the labelled callout (incl. forward reference)", () => {
    const html = compile("{p:voir {@ref[to=pyth]/}.}{@theorem[label=pyth]: x}");
    expect(html).toContain('<a class="htsl-ref" href="#htsl-theorem-pyth">Théorème&nbsp;1</a>');
    expect(html).toContain('id="htsl-theorem-pyth"');
  });

  it("renders an unknown reference inertly (no crash)", () => {
    const html = compile("{@ref[to=nope]/}");
    expect(html).toContain("htsl-ref-broken");
  });

  it("supports French aliases", () => {
    expect(heads(compile("{@theoreme:x}"))).toEqual(["Théorème 1"]);
    expect(heads(compile("{@def:x}"))).toEqual(["Définition 1"]);
    expect(heads(compile("{@preuve:x}"))).toEqual(["Démonstration"]);
  });
});
