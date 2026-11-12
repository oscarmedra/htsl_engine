import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

// B3 — {@corriges} regroups exercise solutions & quiz answers, with back-refs.
describe("{@corriges} — regrouped answers", () => {
  it("keeps an inline collapsible solution when there is no {@corriges}", () => {
    const html = compile("{@exercise:énoncé {solution:4}}");
    expect(html).toContain("htsl-exo-solution");
    expect(html).not.toContain("htsl-exo-corrige");
  });

  it("turns the exercise into a '→ voir le corrigé' link when regrouped", () => {
    const html = compile("{@exercise:énoncé {solution:4}}{@corriges/}");
    expect(html).toContain('class="htsl-exo-corrige" href="#htsl-corrige-exo-1"');
    expect(html).toContain('<div class="htsl-exo" id="htsl-exo-1">');
    expect(html).toContain('id="htsl-corrige-exo-1"');
    expect(html).toContain("Exercice 1");
    expect(html).toContain('href="#htsl-exo-1"'); // back-link
  });

  it("lists a quiz answer (letters) and its explanation in the corrigés", () => {
    const html = compile(
      "{@quiz:{q:Q?}{opt:a}{opt[correct]:b}{opt[correct]:c}{explain:car}}{@corriges/}",
    );
    expect(html).toContain("Réponse : B, C");
    expect(html).toContain("car");
  });

  it("adds letters to the quiz options", () => {
    const html = compile("{@quiz:{q:Q?}{opt:a}{opt:b}}");
    expect(html).toContain('htsl-quiz-letter">A.');
    expect(html).toContain('htsl-quiz-letter">B.');
  });

  it("regroups per section (one {@corriges} per chapter)", () => {
    const html = compile(
      "{@exercise:e1 {solution:s1}}{@corriges/}{@exercise:e2 {solution:s2}}{@corriges/}",
    );
    const nums = [...html.matchAll(/htsl-corrige-head">Exercice (\d)/g)].map((m) => m[1]);
    expect(nums).toEqual(["1", "2"]);
    // two separate <section class="htsl-corriges"> blocks
    expect(html.match(/<section class="htsl-corriges">/g)).toHaveLength(2);
  });
});
