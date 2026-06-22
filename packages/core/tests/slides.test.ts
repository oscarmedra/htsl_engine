import { describe, expect, it } from "vitest";
import { compile, isSlidePath } from "../src/index.js";

describe("slide deck ({@slide})", () => {
  it("recognises the slide path (incl. the `slide` alias)", () => {
    expect(isSlidePath("slide.deck")).toBe(true);
    expect(isSlidePath("math.text.block")).toBe(false);
  });

  it("renders a declarative deck node with nav buttons and a counter", () => {
    const html = compile("{@slide: {section:A} {section:B} {section:C}}");
    expect(html).toContain('class="htsl-deck"');
    expect(html).toContain("data-htsl-slides");
    expect(html).toContain('data-htsl-index="0"');
    expect(html).toContain("htsl-deck-prev");
    expect(html).toContain("htsl-deck-next");
    expect(html).toContain("1 / 3"); // counter
  });

  it("turns each {section:…} child into a slide", () => {
    const html = compile("{@slide: {section:{h1:Un}} {section:{h2:Deux}}}");
    expect(html.match(/<section>/g)).toHaveLength(2);
    expect(html).toContain("<h1>Un</h1>");
    expect(html).toContain("<h2>Deux</h2>");
  });

  it("ignores non-section children (only sections become slides)", () => {
    const html = compile("{@slide: {section:ok} {p:ignoré} {div:aussi ignoré}}");
    expect(html.match(/<section>/g)).toHaveLength(1);
    expect(html).toContain("1 / 1");
    expect(html).not.toContain("ignoré");
  });

  it("never emits an executable inline <script>", () => {
    const html = compile("{@slide: {section:{script:alert(1)}}}");
    expect(html).not.toContain("<script>");
    expect(html).toContain('type="text/plain"'); // the inert form, navigation is the runtime's job
  });
});
