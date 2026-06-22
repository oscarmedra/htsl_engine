import { describe, expect, it } from "vitest";
import { compile, isSlidePath } from "../src/index.js";

describe("slider deck ({@slider})", () => {
  it("recognises slider paths (incl. the `slider` alias)", () => {
    expect(isSlidePath("slider.deck")).toBe(true);
    expect(isSlidePath("slider.slide")).toBe(true);
    expect(isSlidePath("math.text.block")).toBe(false);
  });

  it("renders a declarative deck node with nav buttons and a counter", () => {
    const html = compile(
      "{@slider: {@slider.slide:A} {@slider.slide:B} {@slider.slide:C}}",
    );
    expect(html).toContain('class="htsl-deck"');
    expect(html).toContain("data-htsl-slides");
    expect(html).toContain('data-htsl-index="0"');
    expect(html).toContain("htsl-deck-prev");
    expect(html).toContain("htsl-deck-next");
    expect(html).toContain("1 / 3"); // counter
  });

  it("turns each {@slider.slide:…} child into a <section>", () => {
    const html = compile("{@slider: {@slider.slide:{h1:Un}} {@slider.slide:{h2:Deux}}}");
    expect(html.match(/<section>/g)).toHaveLength(2);
    expect(html).toContain("<h1>Un</h1>");
    expect(html).toContain("<h2>Deux</h2>");
  });

  it("ignores children that are not slides", () => {
    const html = compile("{@slider: {@slider.slide:ok} {p:ignoré} {div:aussi}}");
    expect(html.match(/<section>/g)).toHaveLength(1);
    expect(html).toContain("1 / 1");
    expect(html).not.toContain("ignoré");
  });

  it("never emits an executable inline <script> in a slide", () => {
    const html = compile("{@slider: {@slider.slide:{script:alert(1)}}}");
    expect(html).not.toContain("<script>");
    expect(html).toContain('type="text/plain"'); // inert; navigation is the runtime's job
  });
});
