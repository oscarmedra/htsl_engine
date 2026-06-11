import { describe, expect, it } from "vitest";
import { compile, expand, parse } from "../src/index.js";
import { HTSLError } from "../src/errors.js";
import type { Node } from "../src/types.js";

/** Expand a source string and return the resulting node types (for structure checks). */
function expandedTypes(src: string): string[] {
  return expand(parse(src)).map((n: Node) => n.type);
}

describe("components — definition & expansion", () => {
  it("expands a component, injecting params and children", () => {
    const html = compile(
      `{!define card[title]:{div.card:{h2:{$title}}{div.body:{$children}}}}` +
        `{@card[title="Bonjour"]:contenu}`,
    );
    expect(html).toBe(
      '<div class="card"><h2>Bonjour</h2><div class="body">contenu</div></div>',
    );
  });

  it("removes definitions from the output AST", () => {
    const types = expandedTypes(`{!define c[x]:{p:{$x}}}{@c[x=1]/}`);
    expect(types).not.toContain("define");
    expect(types).toEqual(["element"]);
  });

  it("uses default parameter values", () => {
    const html = compile(`{!define c[color=indigo]:{p.x:{$color}}}{@c/}`);
    expect(html).toBe('<p class="x">indigo</p>');
  });

  it("lets the usage override a default", () => {
    const html = compile(`{!define c[color=indigo]:{p:{$color}}}{@c[color=rose]:x}`);
    expect(html).toBe("<p>rose</p>");
  });

  it("errors on a missing required parameter (localized)", () => {
    try {
      compile(`{!define c[title]:{p:{$title}}}{@c:rien}`);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HTSLError);
      const e = err as HTSLError;
      expect(e.message).toContain('paramètre obligatoire "title" manquant');
      expect(typeof e.line).toBe("number");
      expect(typeof e.col).toBe("number");
    }
  });

  it("allows use before definition (defines collected first)", () => {
    const html = compile(`{@c[title="X"]/}{!define c[title]:{p:{$title}}}`);
    expect(html).toBe("<p>X</p>");
  });

  it("injects empty children for a self-closing usage", () => {
    const html = compile(`{!define c:{div:{$children}}}{@c/}`);
    expect(html).toBe("<div></div>");
  });
});

describe("components — nesting & recursion", () => {
  it("expands a component that uses another component", () => {
    const html = compile(
      `{!define box[c=slate]:{div[class="bg-{$c}"]:{$children}}}` +
        `{!define card[title]:{@box[c=indigo]:{h2:{$title}}{$children}}}` +
        `{@card[title="T"]:corps}`,
    );
    expect(html).toBe('<div class="bg-indigo"><h2>T</h2>corps</div>');
  });

  it("detects direct infinite recursion", () => {
    expect(() => compile(`{!define a:{@a/}}{@a/}`)).toThrow(/récursion infinie/);
  });

  it("detects indirect (mutual) recursion", () => {
    expect(() =>
      compile(`{!define a:{@b/}}{!define b:{@a/}}{@a/}`),
    ).toThrow(/récursion infinie/);
  });
});

describe("components — registry sharing", () => {
  it("errors when a component name collides with a registered object", () => {
    expect(() => compile(`{!define mti[x]:{p:{$x}}}{@mti[x=1]/}`)).toThrow(
      /collision avec un objet enregistré/,
    );
  });

  it("errors on a duplicate component definition", () => {
    expect(() => compile(`{!define c:{p:a}}{!define c:{p:b}}{@c/}`)).toThrow(
      /déjà défini/,
    );
  });
});

describe("variables", () => {
  it("interpolates a variable in text", () => {
    expect(compile(`{!set who: monde}{p:Bonjour {$who}}`)).toBe(
      "<p>Bonjour monde</p>",
    );
  });

  it("interpolates a variable inside an attribute value", () => {
    expect(compile(`{!set theme: emerald}{p[class="text-{$theme}-500"]:x}`)).toBe(
      '<p class="text-emerald-500">x</p>',
    );
  });

  it("honors redefinition (last value at the point of use)", () => {
    expect(compile(`{!set x: A}{p:{$x}}{!set x: B}{p:{$x}}`)).toBe(
      "<p>A</p><p>B</p>",
    );
  });

  it("supports a variable referencing another variable", () => {
    expect(compile(`{!set a: indigo}{!set b: text-{$a}}{p[class="{$b}"]:x}`)).toBe(
      '<p class="text-indigo">x</p>',
    );
  });

  it("errors on an unknown variable (localized)", () => {
    try {
      compile(`{p:{$ghost}}`);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HTSLError);
      expect((err as HTSLError).message).toContain('variable inconnue : "ghost"');
    }
  });

  it("passes document variables into component bodies", () => {
    expect(
      compile(`{!set c: indigo}{!define box:{div[class="bg-{$c}"]:{$children}}}{@box:x}`),
    ).toBe('<div class="bg-indigo">x</div>');
  });
});

describe("components + math", () => {
  it("expands a component wrapping a numbered equation", () => {
    const html = compile(
      `{!define eq[label, body]:{div.eq:{@mte[label="{$label}"]:{$body}}}}` +
        `{@eq[label=e1, body="E = mc^2"]/}`,
    );
    expect(html).toContain('id="htsl-eq-e1"');
    expect(html).toContain("(1)");
    expect(html).toContain("E = mc^2");
  });
});

describe("no regression — plain documents still expand to themselves", () => {
  it("leaves a component-free document unchanged", () => {
    expect(compile("{div.box:{p:hi}}")).toBe('<div class="box"><p>hi</p></div>');
  });
});
