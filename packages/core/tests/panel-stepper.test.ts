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
  it("labels each {@step} automatically (Étape 1, 2, 3…)", () => {
    const html = compile("{@stepper:{@step:{p:a}}{@step:{p:b}}{@step:{p:c}}}");
    const labels = [...html.matchAll(/htsl-step-label">([^<]*)</g)].map((m) => m[1]);
    expect(labels).toEqual(["Étape 1", "Étape 2", "Étape 3"]);
    expect(html).toContain('class="htsl-stepper"');
  });

  it("appends an optional title inside the label tag", () => {
    const html = compile('{@stepper:{@step[title="Poser"]: {p:x}}}');
    expect(html).toContain('<span class="htsl-step-label">Étape 1 — Poser</span>');
  });

  it("ignores non-step children when numbering", () => {
    const html = compile("{@stepper:{@step:{p:a}}{p:ignoré}{@step:{p:b}}}");
    const labels = [...html.matchAll(/htsl-step-label">([^<]*)</g)].map((m) => m[1]);
    expect(labels).toEqual(["Étape 1", "Étape 2"]);
  });

  it("renders a standalone {@step} with an un-numbered label outside a stepper", () => {
    expect(compile("{@step: {p:x}}")).toContain('<span class="htsl-step-label">Étape</span>');
  });

  it("supports the alias {@etape} for a step and {@etapes} for the container", () => {
    const html = compile("{@etapes:{@etape:{p:a}}}");
    expect(html).toContain("htsl-stepper");
    expect(html).toContain('htsl-step-label">Étape 1<');
  });
});
