import { describe, expect, it } from "vitest";
import { compile, parse } from "../src/index.js";

describe("raw-text elements (script / style)", () => {
  it("parses a {script:…} body as a single verbatim text node (not HTSL)", () => {
    const ast = parse(`{script:let a={b:1};}`);
    const el = ast[0];
    if (el?.type !== "element") throw new Error("expected element");
    expect(el.tag).toBe("script");
    expect(el.children).toHaveLength(1);
    expect(el.children[0]).toMatchObject({ type: "text", value: "let a={b:1};" });
  });

  it("does not let a } inside a string close the element", () => {
    const ast = parse(`{script:const x = "a}b"; y();}`);
    const el = ast[0];
    if (el?.type !== "element") throw new Error("expected element");
    expect(el.children[0]).toMatchObject({ type: "text", value: `const x = "a}b"; y();` });
  });

  it("ignores braces in // line and /* */ block comments", () => {
    expect((parse(`{script:// } note\nlet a=1;}`)[0] as { children: unknown[] }).children).toHaveLength(1);
    expect((parse(`{script:/* } */ let a=1;}`)[0] as { children: unknown[] }).children).toHaveLength(1);
  });

  it("does not regress normal HTSL around a script", () => {
    const ast = parse(`{div:{script:let a={b:1};}{p:après}}`);
    const div = ast[0];
    if (div?.type !== "element") throw new Error("expected div");
    expect(div.children.map((c) => (c.type === "element" ? c.tag : c.type))).toEqual([
      "script",
      "p",
    ]);
  });

  it("renders {style:…} verbatim (CSS, with its own braces)", () => {
    expect(compile(`{style:.a { color: red; } .b { display: none; }}`)).toBe(
      "<style>.a { color: red; } .b { display: none; }</style>",
    );
  });

  // SECURITY: HTSL content never produces executable JS.
  it("emits an INLINE script body as inert type=text/plain (never executable)", () => {
    const html = compile(`{script:if(a<b){f();}}`);
    expect(html).toBe(`<script type="text/plain">if(a<b){f();}</script>`);
  });

  it("neutralises a </script> breakout inside an inline script body", () => {
    expect(compile(`{script:s="</script>";}`)).toContain(`<\\/script>`);
    expect(compile(`{script:s="</script>";}`)).not.toContain(`s="</script>"`);
  });

  it("keeps an external {script[src]/} as a real, loadable script", () => {
    expect(compile(`{script[src="/a.js"]/}`)).toBe(`<script src="/a.js"></script>`);
  });
});
