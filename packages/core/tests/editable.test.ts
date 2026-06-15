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

describe("element source ranges", () => {
  it("cover the whole {…} element span", () => {
    const src = "Avant {p.box: Salut} après";
    const el = parse(src, { ranges: true }).find((n) => n.type === "element") as ElementNode;
    expect(el.range).toBeDefined();
    expect(src.slice(el.range![0], el.range![1])).toBe("{p.box: Salut}");
  });

  it("cover the whole {@…} object span (including self-closing)", () => {
    const src = "{@mtr[to=eq1]/}";
    const obj = parse(src, { ranges: true })[0];
    if (obj?.type !== "object") throw new Error("expected object");
    expect(src.slice(obj.range![0], obj.range![1])).toBe("{@mtr[to=eq1]/}");
  });

  it("are absent by default", () => {
    const el = parse("{p:hi}")[0] as ElementNode;
    expect(el.range).toBeUndefined();
  });

  it("exposes the call site (with children) and the component name on an instance", () => {
    const src = "{!define card[t]:{div.card:{h2:{$t}}{div.body:{$children}}}}\n{@card[t=Bonjour]: contenu}";
    const html = render(parse(src, { ranges: true }), { editableText: true });
    // The instance root is tagged with the component name…
    expect(html).toContain('data-htsl-component="card"');
    // …and its range points at the usage `{@card…}` so the preview edits this
    // instance's params + children, not the shared definition.
    const m = html.match(/data-htsl-range="(\d+)-(\d+)"/);
    expect(m).not.toBeNull();
    expect(src.slice(Number(m![1]), Number(m![2]))).toBe("{@card[t=Bonjour]: contenu}");
    // Template internals are not separately editable (single range).
    expect(html.match(/data-htsl-range=/g)).toHaveLength(1);
  });

  it("attaches a source range to the {!define} node", () => {
    const ast = parse("{!define card[t]:{div:{$t}}}", { ranges: true });
    const def = ast.find((n) => n.type === "define");
    expect(def && def.type === "define" && def.range).toBeDefined();
  });
});

describe("editableText render option", () => {
  it("emits data-htsl-range on elements", () => {
    const src = "{h1:Titre}";
    const html = render(parse(src, { ranges: true }), { editableText: true });
    const m = html.match(/data-htsl-range="(\d+)-(\d+)"/);
    expect(m).not.toBeNull();
    expect(src.slice(Number(m![1]), Number(m![2]))).toBe("{h1:Titre}");
  });


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
    // Variable-derived text has no source range → the text is not wrapped in an
    // editable span (the `{p:…}` element itself still carries its own range).
    const html = render(parse("{!set who: monde}{p:{$who}}", { ranges: true }), {
      editableText: true,
    });
    expect(html).not.toContain("htsl-edit");
    expect(html).toContain(">monde</p>");
  });

  it("does not make math content editable", () => {
    const html = render(parse("{@mtb: x^2}", { ranges: true }), { editableText: true });
    expect(html).not.toContain("htsl-edit");
  });
});
