import { describe, expect, it } from "vitest";
import { compile, parse } from "../src/index.js";

describe("raw-text elements (script / style)", () => {
  it("emits script body verbatim, not escaped, with JS braces preserved", () => {
    const html = compile(`{script:if(a<b){f();}else{g();}}`);
    expect(html).toBe("<script>if(a<b){f();}else{g();}</script>");
    expect(html).not.toContain("&lt;");
    expect(html).not.toContain("&amp;");
  });

  it("treats the body as a single text node (not parsed as HTSL)", () => {
    const ast = parse(`{script:let a={b:1};}`);
    const el = ast[0];
    if (el?.type !== "element") throw new Error("expected element");
    expect(el.tag).toBe("script");
    expect(el.children).toHaveLength(1);
    expect(el.children[0]).toMatchObject({ type: "text", value: "let a={b:1};" });
  });

  it("does not let a } inside a string close the element", () => {
    expect(compile(`{script:const x = "a}b"; y();}`)).toBe(
      `<script>const x = "a}b"; y();</script>`,
    );
  });

  it("ignores braces in // line comments (JS) and /* */ block comments", () => {
    expect(compile(`{script:// } note\nlet a=1;}`)).toBe("<script>// } note\nlet a=1;</script>");
    expect(compile(`{script:/* } */ let a=1;}`)).toBe("<script>/* } */ let a=1;</script>");
  });

  it("handles {style:…} CSS verbatim (with its own braces)", () => {
    expect(compile(`{style:.a { color: red; } .b { display: none; }}`)).toBe(
      "<style>.a { color: red; } .b { display: none; }</style>",
    );
  });

  it("does not regress normal HTSL around a script", () => {
    expect(compile(`{div:{script:let a={b:1};}{p:après}}`)).toBe(
      "<div><script>let a={b:1};</script><p>après</p></div>",
    );
  });

  it("keeps attributes and self-closing {script[src]/}", () => {
    expect(compile(`{script[type="module"]:export const x = 1;}`)).toBe(
      `<script type="module">export const x = 1;</script>`,
    );
    expect(compile(`{script[src="/a.js"]/}`)).toBe(`<script src="/a.js"></script>`);
  });
});
