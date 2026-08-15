import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

describe("{@exercise} — numbered exercise", () => {
  it("numbers exercises per document and shows the title after the number", () => {
    const html = compile('{@exercise[title="Deux"]:{p:a}}{@exercise:{p:b}}');
    expect(html).toContain('<div class="htsl-exo-head">Exercice 1 — Deux</div>');
    expect(html).toContain('<div class="htsl-exo-head">Exercice 2</div>');
  });

  it("turns a {solution:…} child into a collapsible <details> (kept out of the body)", () => {
    const html = compile("{@exercise:{p:énoncé}{solution:{p:corrigé}}}");
    expect(html).toContain('<details class="htsl-exo-solution"><summary>Solution</summary>');
    expect(html).toContain("<p>corrigé</p>");
    // the solution is not duplicated in the main body
    expect(html.indexOf("corrigé")).toBe(html.lastIndexOf("corrigé"));
  });

  it("renders no solution block when there is none", () => {
    expect(compile("{@exercise:{p:x}}")).not.toContain("htsl-exo-solution");
  });
});

describe("{@checklist} — native checkboxes", () => {
  it("renders one checkbox per {item}; {item[checked=true]} is pre-checked", () => {
    const html = compile("{@checklist:{item[checked=true]:Fait}{item:À faire}}");
    expect(html).toContain('<input type="checkbox" checked> Fait');
    expect(html).toContain('<input type="checkbox"> À faire');
    expect(html.match(/<li>/g)).toHaveLength(2);
  });
});

describe("{@stepper[guided]} — reveal step by step", () => {
  it("wraps each step in a collapsed <details> when guided", () => {
    const html = compile("{@stepper[guided=true]:{@step[title=\"Un\"]:{p:x}}}");
    expect(html).toContain('class="htsl-stepper htsl-stepper--guided"');
    expect(html).toContain('<details class="htsl-step htsl-step--guided"><summary class="htsl-step-label">Étape 1 — Un</summary>');
  });

  it("stays a plain box (no <details>) without guided", () => {
    expect(compile("{@stepper:{@step:{p:x}}}")).not.toContain("htsl-step--guided");
  });
});

describe("{@numberline} — SVG number line", () => {
  it("emits an <svg> with a point and a segment (open endpoint = hollow)", () => {
    const html = compile('{@numberline[from=-3, to=3]:{segment[from=0, to=2, open=right]/}{point[x=-1, name=A]/}}');
    expect(html).toContain('class="htsl-numberline"');
    expect(html).toContain("<svg");
    expect(html).toContain(">A<"); // the point label
    expect(html).toContain("<circle"); // point + endpoints
    expect(html).toContain("fill=\"#fff\""); // the open (right) endpoint is hollow
  });
});
