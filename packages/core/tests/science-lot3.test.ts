import { describe, expect, it } from "vitest";
import { compile, latexOfObject, parse } from "../src/index.js";
import type { ObjectNode } from "../src/types.js";

const tex = (src: string): string => latexOfObject(parse(src)[0] as ObjectNode);

describe("chemistry {@ce} (mhchem)", () => {
  it("wraps the content in \\ce{…} as inline math", () => {
    expect(tex("{@ce: 2 H2 + O2 -> 2 H2O}")).toBe("\\ce{2 H2 + O2 -> 2 H2O}");
    expect(compile("{@ce: H2O}")).toContain("htsl-math-inline");
  });
});

describe("physical quantity {@qty}", () => {
  it("renders value + upright unit (\\mathrm) with a thin space", () => {
    expect(tex('{@qty[value="9.81", unit="m/s^2"]/}')).toBe("9.81\\,\\mathrm{m/s^2}");
  });
});

describe("truth table {@truthtable}", () => {
  it("renders a header row and body rows, colouring V/true vs F/false", () => {
    const html = compile("{@truthtable:{head: p, q}{row: V, F}}");
    expect(html).toContain('<table class="htsl-truthtable">');
    expect(html).toContain("<thead><tr><th>p</th><th>q</th></tr></thead>");
    expect(html).toContain('<td class="htsl-tt-true">V</td>');
    expect(html).toContain('<td class="htsl-tt-false">F</td>');
  });
});

describe("code block {@codeblock}", () => {
  it("takes content verbatim — braces and backslashes need no escaping", () => {
    const html = compile("{@codeblock[lang=js]:\nfunction f() { return { a: 1 }; }\n}");
    expect(html).toContain('<pre class="htsl-code" data-lang="js">');
    expect(html).toContain('<code class="language-js">');
    expect(html).toContain("function f() { return { a: 1 }; }");
  });

  it("strips the leading newline and trailing whitespace but keeps indentation", () => {
    const html = compile("{@codeblock:\n  indented\n}");
    expect(html).toContain(">  indented</code>");
  });

  it("works through its aliases ({@listing} / {@source})", () => {
    expect(compile("{@listing:\nx = {}\n}")).toContain('class="htsl-code"');
  });
});
