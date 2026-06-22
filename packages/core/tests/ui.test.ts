import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

describe("{@reveal} (collapsible)", () => {
  it("renders a native <details> with the title as summary (zero JS)", () => {
    const html = compile('{@reveal[title="Correction"]: {p:c = 5}}');
    expect(html).toContain('<details class="htsl-reveal">');
    expect(html).toContain('class="htsl-reveal-summary">Correction<');
    expect(html).toContain("<p>c = 5</p>");
    expect(html).not.toContain("<script>");
  });

  it("defaults the title to « Solution » and honours open=true", () => {
    expect(compile("{@reveal: x}")).toContain(">Solution<");
    expect(compile("{@reveal[open=true]: x}")).toContain("<details class=\"htsl-reveal\" open>");
  });
});

describe("{@tabs}", () => {
  it("renders a declarative tabs node with one button + panel per tab", () => {
    const html = compile(
      '{@tabs: {@tabs.tab[title="Énoncé"]: {p:E}} {@tabs.tab[title="Indice"]: {p:I}} {@tabs.tab[title="Solution"]: {p:S}}}',
    );
    expect(html).toContain("data-htsl-tabs");
    expect(html).toContain('data-htsl-tab="0"');
    expect(html.match(/htsl-tab-btn/g)).toHaveLength(3);
    expect(html.match(/htsl-tab-panel/g)).toHaveLength(3);
    expect(html).toContain('data-htsl-tab-to="2">Solution<');
  });

  it("labels untitled tabs and ignores non-tab children", () => {
    const html = compile("{@tabs: {@tabs.tab: {p:A}} {p:ignoré}}");
    expect(html.match(/htsl-tab-panel/g)).toHaveLength(1);
    expect(html).toContain(">Onglet 1<");
    expect(html).not.toContain("ignoré");
  });
});

describe("{@quiz}", () => {
  it("renders options with a data-correct flag and a hidden explanation", () => {
    const html = compile(
      "{@quiz: {q:Q ?} {opt[correct=true]:A} {opt:B} {opt:C} {explain:car…}}",
    );
    expect(html).toContain("data-htsl-quiz");
    expect(html).toContain("<div class=\"htsl-quiz-q\">Q ?</div>");
    const flags = [...html.matchAll(/data-correct="(\d)"/g)].map((m) => m[1]);
    expect(flags).toEqual(["1", "0", "0"]); // first option correct
    expect(html).toContain('class="htsl-quiz-explain" hidden>car…');
    expect(html).not.toContain("<script>");
  });

  it("treats correct=false as a wrong option", () => {
    const html = compile("{@quiz: {q:x} {opt[correct=false]:A} {opt[correct=true]:B}}");
    expect([...html.matchAll(/data-correct="(\d)"/g)].map((m) => m[1])).toEqual(["0", "1"]);
  });
});

describe("{@flashcard}", () => {
  it("renders a pure-CSS flip card (checkbox + label, two faces)", () => {
    const html = compile("{@flashcard: {front:Question} {back:Réponse}}");
    expect(html).toContain('class="htsl-fc-toggle"');
    expect(html).toContain('class="htsl-fc-inner"');
    expect(html).toContain("htsl-fc-front");
    expect(html).toContain("htsl-fc-back");
    expect(html).toContain("Question");
    expect(html).toContain("Réponse");
    expect(html).not.toContain("<script>");
  });

  it("gives each card a unique toggle id", () => {
    const html = compile("{@flashcard:{front:a}{back:b}}{@flashcard:{front:c}{back:d}}");
    const ids = [...html.matchAll(/id="(htsl-fc-\d+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(2);
  });
});
