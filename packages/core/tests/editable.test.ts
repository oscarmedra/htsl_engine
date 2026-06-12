import { describe, expect, it } from "vitest";
import { parse, render } from "../src/index.js";
import type { ElementNode, TextNode } from "../src/types.js";

function firstText(src: string): TextNode {
  const el = parse(src, { ranges: true })[0] as ElementNode;
  const t = el.children.find((c) => c.type === "text");
  if (!t || t.type !== "text") throw new Error("no text node");
  return t;
}

describe("source ranges", () => {
  it("are absent by default (AST unchanged)", () => {
    const el = parse("{p:Bonjour}")[0] as ElementNode;
    expect((el.children[0] as TextNode).range).toBeUndefined();
  });

  it("map a text node back to its raw source span", () => {
    const src = "{p:Bonjour le monde}";
    const t = firstText(src);
    expect(t.range).toBeDefined();
    const [start, end] = t.range!;
    expect(src.slice(start, end)).toBe("Bonjour le monde");
  });

  it("cover the raw (escaped) span, not the decoded value", () => {
    const src = "{p:a\\{b}";
    const t = firstText(src);
    const [start, end] = t.range!;
    expect(t.value).toBe("a{b"); // decoded
    expect(src.slice(start, end)).toBe("a\\{b"); // raw source
  });
});

describe("editableText render option", () => {
  it("is off by default", () => {
    expect(render(parse("{p:hi}"), {})).not.toContain("htsl-edit");
  });

  it("wraps source-backed text in an editable span with offsets", () => {
    const src = "{p:Bonjour}";
    const html = render(parse(src, { ranges: true }), { editableText: true });
    const m = html.match(/data-htsl-text="(\d+)-(\d+)"/);
    expect(m).not.toBeNull();
    const start = Number(m![1]);
    const end = Number(m![2]);
    expect(src.slice(start, end)).toBe("Bonjour");
    expect(html).toContain('class="htsl-edit"');
  });

  it("does not wrap text without a range (e.g. from variables)", () => {
    // Variable-derived text has no source range → not editable.
    const html = render(parse("{!set who: monde}{p:{$who}}", { ranges: true }), {
      editableText: true,
    });
    expect(html).toBe("<p>monde</p>");
  });

  it("does not make math content editable", () => {
    const html = render(parse("{@mtb: x^2}", { ranges: true }), { editableText: true });
    expect(html).not.toContain("htsl-edit");
  });
});
