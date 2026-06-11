import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "../src/parser.js";
import { render } from "../src/renderer.js";
import { compile } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");

describe("renderer — basics", () => {
  it("renders a simple element", () => {
    expect(compile("{p:Bonjour}")).toBe("<p>Bonjour</p>");
  });

  it("renders id, classes and attributes in order", () => {
    expect(compile("{div#main.box[data-x=1]:hi}")).toBe(
      '<div id="main" class="box" data-x="1">hi</div>',
    );
  });

  it("joins multiple classes with a space", () => {
    expect(compile("{p.a.b.c:x}")).toBe('<p class="a b c">x</p>');
  });
});

describe("renderer — XSS escaping (§6)", () => {
  it("escapes script tags in text content", () => {
    expect(compile("{p:<script>alert(1)</script>}")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });

  it("escapes &, <, >, \" in text", () => {
    expect(compile('{p:a & b < c > d " e}')).toBe(
      "<p>a &amp; b &lt; c &gt; d &quot; e</p>",
    );
  });

  it("escapes attribute values", () => {
    expect(compile('{a[title="\\"><b>"]:x}')).toBe(
      '<a title="&quot;&gt;&lt;b&gt;">x</a>',
    );
  });
});

describe("renderer — void elements", () => {
  it("renders void tags without a closing tag", () => {
    expect(compile('{img[src="a.png"]/}')).toBe('<img src="a.png">');
    expect(compile("{br/}")).toBe("<br>");
    expect(compile("{hr/}")).toBe("<hr>");
  });
});

describe("renderer — allowedTags", () => {
  it("renders a disallowed tag as escaped text", () => {
    const out = render(parse("{script:alert(1)}"), { allowedTags: ["p", "div"] });
    expect(out).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("keeps allowed tags live", () => {
    const out = render(parse("{p:ok}"), { allowedTags: ["p"] });
    expect(out).toBe("<p>ok</p>");
  });
});

describe("renderer — pretty print", () => {
  it("indents nested elements with 2 spaces", () => {
    const out = compile("{div.box:{p:Bonjour}{span.red:Important}}", {
      prettyPrint: true,
    });
    expect(out).toBe(
      [
        '<div class="box">',
        "  <p>Bonjour</p>",
        '  <span class="red">Important</span>',
        "</div>",
      ].join("\n"),
    );
  });

  it("inlines a lone text child", () => {
    expect(compile("{p:Bonjour}", { prettyPrint: true })).toBe("<p>Bonjour</p>");
  });
});

describe("renderer — comments produce no output", () => {
  it("drops comment nodes", () => {
    expect(compile("{p:a}{!-- note --}{p:b}")).toBe("<p>a</p><p>b</p>");
  });
});

/* -------------------------------------------------------------------------- */
/* Golden files                                                               */
/* -------------------------------------------------------------------------- */

describe("renderer — golden files (fixtures)", () => {
  const inputs = readdirSync(fixturesDir).filter((f) => f.endsWith(".htsl"));

  it("has at least 5 golden fixtures", () => {
    expect(inputs.length).toBeGreaterThanOrEqual(5);
  });

  for (const input of inputs) {
    const name = input.replace(/\.htsl$/, "");
    it(`matches golden output for "${name}"`, () => {
      const htsl = readFileSync(join(fixturesDir, input), "utf8");
      const expected = readFileSync(join(fixturesDir, `${name}.html`), "utf8");
      const actual = compile(htsl, { prettyPrint: true });
      expect(actual.trim()).toBe(expected.trim());
    });
  }
});
