import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

// A1 — whitespace between two inline elements/objects is a significant word
// separator and must be preserved (it used to be dropped → "x" glued to "strong").
describe("A1 — inline whitespace between elements is preserved", () => {
  it("keeps the space between a formula and an element", () => {
    expect(compile("{p:la norme $x$ {strong:importante}}")).toContain("</span> <strong>");
  });

  it("keeps the space between two inline elements", () => {
    expect(compile("{p:{em:un} {em:deux}}")).toBe("<p><em>un</em> <em>deux</em></p>");
  });

  it("still keeps the space after plain text", () => {
    expect(compile("{p:mot {strong:gras}}")).toBe("<p>mot <strong>gras</strong></p>");
  });

  it("trims leading/trailing whitespace inside an inline element", () => {
    expect(compile("{p: {em:x} }")).toBe("<p><em>x</em></p>");
  });
});

// A2 — raw/codeblock content and attributes must tolerate apostrophes/quotes.
describe("A2 — apostrophes & quotes in code blocks and attributes", () => {
  it("keeps a lone apostrophe in {@codeblock} (French / Python comments)", () => {
    expect(compile("{@codeblock:# l'exemple}")).toContain("# l'exemple");
  });

  it("handles quotes and apostrophes together in a code block", () => {
    const html = compile("{@codeblock:return \"c'est bon\"}");
    expect(html).toContain("return &quot;c'est bon&quot;");
  });

  it("accepts single-quoted attribute values", () => {
    expect(compile("{p[title='mon titre']:x}")).toBe('<p title="mon titre">x</p>');
  });

  it("still tracks strings in {style} so a brace inside a string does not close it", () => {
    expect(compile('{style: .a { content: "}"; } }')).toContain('content: "}"');
  });
});

// A3 — a closing brace inside $…$ is literal LaTeX, not the HTSL block closer.
describe("A3 — a brace inside a formula is literal", () => {
  it("allows a lone } inside inline math", () => {
    expect(compile("{p:$A}$ fin}")).toContain('htsl-math-raw">A}</span>');
  });

  it("still closes a brace-delimited math object normally", () => {
    expect(compile("{@mtb: \\frac{a}{b}}")).toContain("\\frac{a}{b}");
  });
});
