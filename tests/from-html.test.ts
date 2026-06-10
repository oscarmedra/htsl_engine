import { describe, expect, it } from "vitest";
import { fromHtml, parseHtml, toHtsl } from "../src/from-html.js";
import { compile } from "../src/index.js";
import type { ElementNode } from "../src/types.js";

/** Normalize HTML to a single line for round-trip comparison. */
function flat(html: string): string {
  return html.replace(/\n\s*/g, "");
}

describe("fromHtml — basics", () => {
  it("converts a simple element", () => {
    expect(fromHtml("<p>Bonjour</p>")).toBe("{p:Bonjour}");
  });

  it("converts id and classes to selectors", () => {
    expect(fromHtml('<div id="main" class="box red">x</div>')).toBe(
      "{div#main.box.red:x}",
    );
  });

  it("converts attributes (quoted and unquoted)", () => {
    expect(fromHtml('<a href="/x" data-n="1">lien</a>')).toBe(
      "{a[href=\"/x\", data-n=1]:lien}",
    );
  });

  it("converts void elements to self-closing form", () => {
    expect(fromHtml('<img src="a.png">')).toBe('{img[src="a.png"]/}');
    expect(fromHtml("<br>")).toBe("{br/}");
  });

  it("converts comments", () => {
    expect(fromHtml("<!-- note -->")).toBe("{!-- note --}");
  });

  it("escapes HTSL-structural characters in text", () => {
    expect(fromHtml("<p>a{b}c:d</p>")).toBe("{p:a\\{b\\}c\\:d}");
  });

  it("decodes HTML entities back to characters", () => {
    expect(fromHtml("<p>&lt;tag&gt; &amp; &#39;x&#39;</p>")).toBe(
      "{p:<tag> & 'x'}",
    );
  });
});

describe("parseHtml — AST", () => {
  it("keeps non-ident class values as a class attribute", () => {
    const ast = parseHtml('<div class="1bad ok">x</div>');
    const el = ast[0] as ElementNode;
    // "1bad" is not a valid HTSL identifier → keep the whole class as attr
    expect(el.classes).toEqual([]);
    expect(el.attrs).toEqual({ class: "1bad ok" });
  });

  it("handles boolean attributes", () => {
    const ast = parseHtml("<input disabled>");
    const el = ast[0] as ElementNode;
    expect(el.attrs).toEqual({ disabled: "" });
  });

  it("auto-closes unclosed tags at EOF", () => {
    const ast = parseHtml("<div><p>hi");
    const div = ast[0] as ElementNode;
    expect(div.tag).toBe("div");
    expect((div.children[0] as ElementNode).tag).toBe("p");
  });

  it("never throws on malformed input", () => {
    const samples = ["<", "<<>>", "<div", "</p>", "<a b=>", "<!-- ", "<p>&bad;"];
    for (const s of samples) expect(() => fromHtml(s)).not.toThrow();
  });
});

describe("toHtsl — options", () => {
  it("supports compact output", () => {
    const ast = parseHtml("<ul><li>a</li><li>b</li></ul>");
    expect(toHtsl(ast, { prettyPrint: false })).toBe("{ul:{li:a}{li:b}}");
  });

  it("indents by default", () => {
    expect(fromHtml("<ul><li>a</li><li>b</li></ul>")).toBe(
      ["{ul:", "  {li:a}", "  {li:b}", "}"].join("\n"),
    );
  });
});

describe("round-trip HTML → HTSL → HTML", () => {
  const cases = [
    "<p>Bonjour</p>",
    '<div class="box"><h1 id="t">Titre</h1></div>',
    '<a href="/x" title="val 2" data-n="1">lien</a>',
    '<img src="a.png" alt="photo">',
    "<ul><li>a</li><li>b</li></ul>",
    "<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; co</p>",
  ];

  for (const html of cases) {
    it(`preserves ${html}`, () => {
      const back = compile(fromHtml(html));
      expect(flat(back)).toBe(flat(html));
    });
  }
});
