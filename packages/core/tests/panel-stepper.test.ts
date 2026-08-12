import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

describe("{@panel} — neutral box", () => {
  it("renders a box with no header/title by default (neutral slate accent)", () => {
    const html = compile("{@panel: {p:contenu}}");
    expect(html).toContain('class="htsl-panel htsl-panel--slate"');
    expect(html).not.toContain("htsl-panel-title"); // no title by default
    expect(html).toContain('<div class="htsl-panel-body"><p>contenu</p></div>');
  });

  it("shows a title only when provided, and applies the chosen color", () => {
    const html = compile('{@panel[color=indigo, title="En bref"]: {p:x}}');
    expect(html).toContain("htsl-panel--indigo");
    expect(html).toContain('<div class="htsl-panel-title">En bref</div>');
  });

  it("falls back to slate for an unknown color", () => {
    expect(compile("{@panel[color=fuchsia]: x}")).toContain("htsl-panel--slate");
  });

  it("supports the aliases overview / box / panneau", () => {
    for (const a of ["overview", "box", "panneau"]) {
      expect(compile(`{@${a}: y}`), a).toContain('class="htsl-panel');
    }
  });
});

describe("{@stepper} — numbered steps", () => {
  it("numbers each {@step} automatically (1, 2, 3…)", () => {
    const html = compile("{@stepper:{@step:{p:a}}{@step:{p:b}}{@step:{p:c}}}");
    const nums = [...html.matchAll(/htsl-step-num">([^<]*)</g)].map((m) => m[1]);
    expect(nums).toEqual(["1", "2", "3"]);
    expect(html).toContain('class="htsl-stepper"');
  });

  it("shows an optional step title after the number", () => {
    const html = compile('{@stepper:{@step[title="Poser"]: {p:x}}}');
    expect(html).toContain('<div class="htsl-step-title">Poser</div>');
    expect(html).toContain('<div class="htsl-step-num">1</div>');
  });

  it("ignores non-step children when numbering", () => {
    const html = compile("{@stepper:{@step:{p:a}}{p:ignoré}{@step:{p:b}}}");
    const nums = [...html.matchAll(/htsl-step-num">([^<]*)</g)].map((m) => m[1]);
    expect(nums).toEqual(["1", "2"]);
  });

  it("renders a standalone {@step} with a bullet (no number outside a stepper)", () => {
    expect(compile("{@step: {p:x}}")).toContain('<div class="htsl-step-num">•</div>');
  });

  it("supports the alias {@etape} for a step and {@etapes} for the container", () => {
    const html = compile("{@etapes:{@etape:{p:a}}}");
    expect(html).toContain("htsl-stepper");
    expect(html).toContain('htsl-step-num">1<');
  });
});
