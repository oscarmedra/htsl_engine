import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

const heads = (html: string): string[] =>
  [...html.matchAll(/htsl-callout-head">([^<]*)/g)].map((m) => m[1]!.trim());

// C1 — per-chapter numbering ("Théorème 18.3"); C2 — {@ref[to=…]} resolves it.
describe("C1/C2 — chapter numbering and cross-references", () => {
  const src =
    "{h1:Ch1}{@theorem[label=pyth]:a}{@theorem:b}{h1:Ch2}{@theorem:c}{@definition:d}";

  it("numbers globally by default", () => {
    expect(heads(compile(src))).toEqual(["Théorème 1", "Théorème 2", "Théorème 3", "Définition 1"]);
  });

  it("numbers per chapter with chapterNumbering", () => {
    expect(heads(compile(src, { chapterNumbering: true }))).toEqual([
      "Théorème 1.1",
      "Théorème 1.2",
      "Théorème 2.1",
      "Définition 2.1",
    ]);
  });

  it("{@ref} shows the chapter number and links to the target", () => {
    const html = compile(src + "{p:voir {@ref[to=pyth]/}}", { chapterNumbering: true });
    expect(html).toContain('href="#htsl-theorem-pyth">Théorème&nbsp;1.1<');
  });

  it("flags a broken reference", () => {
    expect(compile("{p:{@ref[to=inconnu]/}}")).toContain("htsl-ref-broken");
  });
});
