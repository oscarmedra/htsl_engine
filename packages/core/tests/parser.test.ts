import { describe, expect, it } from "vitest";
import { parse } from "../src/parser.js";
import { HTSLError } from "../src/errors.js";
import type { ElementNode, ErrorNode } from "../src/types.js";

function firstElement(src: string): ElementNode {
  const ast = parse(src);
  const el = ast[0];
  if (!el || el.type !== "element") throw new Error("expected an element node");
  return el;
}

describe("parser — syntax (§2)", () => {
  it("parses {tag:contenu}", () => {
    const el = firstElement("{p:Bonjour}");
    expect(el.tag).toBe("p");
    expect(el.children).toEqual([
      { type: "text", value: "Bonjour", loc: { line: 1, col: 4 } },
    ]);
  });

  it("parses classes", () => {
    const el = firstElement("{tag.class1.class2:c}");
    expect(el.classes).toEqual(["class1", "class2"]);
  });

  it("parses an id", () => {
    expect(firstElement("{tag#monId:c}").id).toBe("monId");
  });

  it("parses attributes (quoted and unquoted)", () => {
    const el = firstElement('{tag[attr1=val1, attr2="val 2"]:texte}');
    expect(el.attrs).toEqual({ attr1: "val1", attr2: "val 2" });
  });

  it("parses signed/decimal numeric attribute values (e.g. -2.5)", () => {
    const el = firstElement("{tag[x=-2.5, y=2.5, z=-3]:t}");
    expect(el.attrs).toEqual({ x: "-2.5", y: "2.5", z: "-3" });
  });

  it("parses a self-closing element", () => {
    const el = firstElement('{img[src="a.png"]/}');
    expect(el.selfClosing).toBe(true);
    expect(el.children).toEqual([]);
    expect(el.attrs).toEqual({ src: "a.png" });
  });

  it("combines id, classes and attributes", () => {
    const el = firstElement("{div#main.box[data-x=1]:hello}");
    expect(el.id).toBe("main");
    expect(el.classes).toEqual(["box"]);
    expect(el.attrs).toEqual({ "data-x": "1" });
  });

  it("treats comments as comment nodes", () => {
    const ast = parse("{!-- hi --}");
    expect(ast).toEqual([
      { type: "comment", value: " hi ", loc: { line: 1, col: 1 } },
    ]);
  });

  it("supports escaped braces and colons in text", () => {
    const el = firstElement("{p:a\\{b\\}c\\:d}");
    expect(el.children[0]).toMatchObject({ type: "text", value: "a{b}c:d" });
  });
});

describe("parser — nesting", () => {
  it("parses nested elements and drops layout whitespace", () => {
    const el = firstElement("{div.box:\n  {p:Bonjour}\n  {span.red:Important}\n}");
    expect(el.children.map((c) => c.type)).toEqual(["element", "element"]);
    const [p, span] = el.children as ElementNode[];
    expect(p?.tag).toBe("p");
    expect(span?.classes).toEqual(["red"]);
  });

  it("preserves the AST shape from the spec", () => {
    const el = firstElement("{div.box:Bonjour}");
    expect(el).toEqual({
      type: "element",
      tag: "div",
      id: null,
      classes: ["box"],
      attrs: {},
      selfClosing: false,
      children: [{ type: "text", value: "Bonjour", loc: { line: 1, col: 10 } }],
      loc: { line: 1, col: 1 },
    });
  });

  it("handles deep nesting up to maxDepth", () => {
    const depth = 50;
    const src = "{a:".repeat(depth) + "x" + "}".repeat(depth);
    expect(() => parse(src)).not.toThrow();
  });

  it("rejects nesting beyond maxDepth", () => {
    const src = "{a:".repeat(10) + "x" + "}".repeat(10);
    expect(() => parse(src, { maxDepth: 4 })).toThrow(HTSLError);
  });
});

describe("parser — errors (§5), strict mode", () => {
  it("detects an unclosed brace", () => {
    expect(() => parse("{p:Texte sans fermeture")).toThrow(/jamais fermée/);
  });

  it("detects an orphan closing brace", () => {
    expect(() => parse("hello}")).toThrow(/orpheline/);
  });

  it("detects a malformed attribute (missing value)", () => {
    expect(() => parse("{a[x=]:y}")).toThrow(/attribut malformé/);
  });

  it("detects a malformed attribute (missing equals)", () => {
    expect(() => parse("{a[x]:y}")).toThrow(/attribut malformé/);
  });

  it("detects an invalid identifier", () => {
    expect(() => parse("{1tag:x}")).toThrow(/invalide/);
  });

  it("reports the correct line/col for an unclosed tag", () => {
    try {
      parse("{div:\n  {p:Texte sans fermeture");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HTSLError);
      const e = err as HTSLError;
      expect(e.line).toBe(2);
      expect(e.col).toBe(3);
      expect(e.message).toContain('balise "{p" jamais fermée');
      expect(e.message).toContain("^");
    }
  });
});

describe("parser — tolerant mode", () => {
  it("inserts an error node instead of throwing", () => {
    const ast = parse("{p:ok}{bad", { mode: "tolerant" });
    expect(ast[0]).toMatchObject({ type: "element", tag: "p" });
    const err = ast[1] as ErrorNode;
    expect(err.type).toBe("error");
    expect(err.message).toContain("jamais fermée");
  });

  it("recovers from an orphan closing brace", () => {
    const ast = parse("a}{p:b}", { mode: "tolerant" });
    const types = ast.map((n) => n.type);
    expect(types).toContain("error");
    expect(types).toContain("element");
  });

  it("never throws on malformed input", () => {
    const samples = ["{", "}", "{p", "{a[x=]", "{.bad:y}", "{!--", "{p:{q:"];
    for (const s of samples) {
      expect(() => parse(s, { mode: "tolerant" })).not.toThrow();
    }
  });
});
