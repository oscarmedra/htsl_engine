import { describe, expect, it } from "vitest";
import { parse, compile, render, latexOfObject } from "../src/index.js";
import { HTSLError } from "../src/errors.js";
import type { KatexLike, Node, ObjectNode } from "../src/types.js";

function obj(src: string): ObjectNode {
  const node = parse(src)[0];
  if (!node || node.type !== "object") throw new Error("expected an object node");
  return node;
}

/** Strip loc fields so two ASTs can be compared structurally. */
function stripLoc(node: Node): unknown {
  switch (node.type) {
    case "object":
      return {
        type: node.type,
        path: node.path,
        attrs: node.attrs,
        selfClosing: node.selfClosing,
        children: node.children.map(stripLoc),
      };
    case "element":
      return {
        type: node.type,
        tag: node.tag,
        id: node.id,
        classes: node.classes,
        attrs: node.attrs,
        selfClosing: node.selfClosing,
        children: node.children.map(stripLoc),
      };
    case "text":
      return { type: node.type, value: node.value };
    default:
      return { type: node.type };
  }
}

describe("math — parsing each object", () => {
  it("parses math.text.inline (mti)", () => {
    const o = obj("{@mti: x^2 + 1}");
    expect(o.path).toBe("math.text.inline");
    expect(latexOfObject(o)).toBe("x^2 + 1");
  });

  it("parses math.text.block (mtb)", () => {
    const o = obj("{@mtb: \\int_0^1 x^2 dx}");
    expect(o.path).toBe("math.text.block");
    expect(latexOfObject(o)).toBe("\\int_0^1 x^2 dx");
  });

  it("parses math.text.equation (mte) with a label", () => {
    const o = obj("{@mte[label=eq1]: E = mc^2}");
    expect(o.path).toBe("math.text.equation");
    expect(o.attrs).toEqual({ label: "eq1" });
    expect(latexOfObject(o)).toBe("E = mc^2");
  });

  it("parses math.text.ref (mtr) as self-closing", () => {
    const o = obj("{@mtr[to=eq1]/}");
    expect(o.path).toBe("math.text.ref");
    expect(o.selfClosing).toBe(true);
    expect(o.attrs).toEqual({ to: "eq1" });
  });

  it("parses math.text.align (mta) into an aligned environment", () => {
    const o = obj("{@mta: {line: f(x) &= x^2} {line: &= x \\cdot x}}");
    expect(o.path).toBe("math.text.align");
    expect(latexOfObject(o)).toBe(
      "\\begin{aligned} f(x) &= x^2 \\\\ &= x \\cdot x \\end{aligned}",
    );
  });

  it("parses math.text.cases (mtc) with an intro", () => {
    const o = obj('{@mtc[intro="f(x)"]: {case: x^2 & si x \\geq 0} {case: -x & sinon}}');
    expect(latexOfObject(o)).toBe(
      "f(x) = \\begin{cases} x^2 & si x \\geq 0 \\\\ -x & sinon \\end{cases}",
    );
  });

  it("parses math.text.system (mts)", () => {
    const o = obj("{@mts: {line: 2x + y = 5} {line: x - y = 1}}");
    expect(latexOfObject(o)).toBe(
      "\\left\\{ \\begin{array}{l} 2x + y = 5 \\\\ x - y = 1 \\end{array} \\right.",
    );
  });
});

describe("math — shorthand unification", () => {
  it("makes $x$ produce the same AST as {@mti:x}", () => {
    expect(stripLoc(parse("$x$")[0]!)).toEqual(stripLoc(parse("{@mti:x}")[0]!));
  });

  it("makes $$x$$ produce the same AST as {@mtb:x}", () => {
    expect(stripLoc(parse("$$x$$")[0]!)).toEqual(stripLoc(parse("{@mtb:x}")[0]!));
  });

  it("renders shorthand and explicit forms identically", () => {
    expect(compile("$x^2$")).toBe(compile("{@mti:x^2}"));
    expect(compile("$$x^2$$")).toBe(compile("{@mtb:x^2}"));
  });
});

describe("math — nested objects resolve to LaTeX", () => {
  it("resolves {@mof:...} and {@mc.pi/} inside a block", () => {
    const o = obj("{@mtb: {@mof:{num:1}{den:2}} \\cdot {@mc.pi/}}");
    expect(latexOfObject(o)).toBe("\\frac{1}{2} \\cdot \\pi");
  });

  it("renders the nested formula", () => {
    const html = compile("{@mtb: {@mof:{num:1}{den:2}} \\cdot {@mc.pi/}}");
    expect(html).toContain("\\frac{1}{2} \\cdot \\pi");
  });
});

describe("math — structured objects (vector, matrix, complex, set, interval)", () => {
  it("renders a column vector (mov) as a pmatrix", () => {
    expect(latexOfObject(obj("{@mov:{c:1}{c:2}{c:3}}"))).toBe(
      "\\begin{pmatrix} 1 \\\\ 2 \\\\ 3 \\end{pmatrix}",
    );
  });

  it("renders a matrix (mom), splitting row cells on commas", () => {
    expect(latexOfObject(obj("{@mom:{row:1,2}{row:3,4}}"))).toBe(
      "\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}",
    );
  });

  it("renders a set (mos) wrapped in braces", () => {
    expect(latexOfObject(obj("{@mos: 1, 2, 3}"))).toBe("\\left\\{ 1, 2, 3 \\right\\}");
  });

  it("renders a complex number (moc) with sign and unit handling", () => {
    expect(latexOfObject(obj("{@moc[re=3, im=2]/}"))).toBe("3 + 2i");
    expect(latexOfObject(obj("{@moc[re=3, im=-2]/}"))).toBe("3 - 2i");
    expect(latexOfObject(obj("{@moc[re=0, im=1]/}"))).toBe("i");
    expect(latexOfObject(obj("{@moc[re=5, im=0]/}"))).toBe("5");
  });

  it("renders an interval (moi) with open/closed bounds", () => {
    expect(latexOfObject(obj('{@moi[from=0, to=1]/}'))).toBe("\\left[ 0, 1 \\right]");
    expect(latexOfObject(obj('{@moi[from=0, to=1, open="right"]/}'))).toBe(
      "\\left[ 0, 1 \\right[",
    );
    expect(latexOfObject(obj('{@moi[from=0, to=1, open="both"]/}'))).toBe(
      "\\left] 0, 1 \\right[",
    );
  });

  it("renders the extra constants (e, inf, phi, i)", () => {
    expect(latexOfObject(obj("{@mc.e/}"))).toBe("e");
    expect(latexOfObject(obj("{@mc.inf/}"))).toBe("\\infty");
    expect(latexOfObject(obj("{@mc.phi/}"))).toBe("\\varphi");
    expect(latexOfObject(obj("{@mc.i/}"))).toBe("i");
  });
});

describe("math — equation numbering", () => {
  it("numbers equations sequentially in document order", () => {
    const html = compile("{@mte:a}{@mte:b}{@mte[label=z]:c}");
    expect(html).toContain("(1)");
    expect(html).toContain("(2)");
    expect(html).toContain("(3)");
    // The labelled one is the third.
    expect(html).toContain('id="htsl-eq-z"');
    expect(html.indexOf("(3)")).toBeGreaterThan(html.indexOf("(2)"));
  });
});

describe("math — cross references", () => {
  it("resolves a valid reference (including forward refs)", () => {
    const html = compile("{p:voir {@mtr[to=e2]/}}{@mte:a}{@mte[label=e2]:b}");
    expect(html).toContain('<a class="htsl-math-ref" href="#htsl-eq-e2">(2)</a>');
  });

  it("throws a localized error for an unknown reference", () => {
    try {
      compile("{p:{@mtr[to=ghost]/}}");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HTSLError);
      const e = err as HTSLError;
      expect(e.message).toContain("ghost");
      expect(e.line).toBe(1);
      expect(typeof e.col).toBe("number");
    }
  });
});

describe("math — KaTeX integration", () => {
  const fakeKatex: KatexLike = {
    renderToString(tex, options) {
      const mode = options?.displayMode ? "display" : "inline";
      return `<KATEX ${mode}>${tex}</KATEX>`;
    },
  };

  it("uses KaTeX when provided", () => {
    const html = render(parse("{@mti:x^2}"), { katex: fakeKatex });
    expect(html).toContain("<KATEX inline>x^2</KATEX>");
  });

  it("uses display mode for blocks", () => {
    const html = render(parse("{@mtb:x^2}"), { katex: fakeKatex });
    expect(html).toContain("<KATEX display>x^2</KATEX>");
  });

  it("falls back to raw LaTeX without KaTeX", () => {
    expect(compile("{@mti:x^2}")).toContain('class="htsl-math-raw"');
  });
});
