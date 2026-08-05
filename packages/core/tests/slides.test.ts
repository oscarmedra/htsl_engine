import { describe, expect, it } from "vitest";
import { compile, isSlidePath } from "../src/index.js";
import { parseDurationMs, deckTransition } from "../src/objects/slides.js";

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

describe("slider — transitions & auto-advance", () => {
  it("defaults to transition=none and no autoplay/play button", () => {
    const html = compile("{@slider: {@slider.slide:A}}");
    expect(html).toContain('data-htsl-transition="none"');
    expect(html).not.toContain("data-htsl-autoplay");
    expect(html).not.toContain("htsl-deck-play");
  });

  it("emits the chosen transition; unknown values fall back to none", () => {
    expect(compile("{@slider[transition=fade]: {@slider.slide:A}}")).toContain(
      'data-htsl-transition="fade"',
    );
    expect(compile("{@slider[transition=wobble]: {@slider.slide:A}}")).toContain(
      'data-htsl-transition="none"',
    );
  });

  it("parses autoplay durations to ms and adds a play button + loop flag", () => {
    const html = compile('{@slider[autoplay="8s", loop=true]: {@slider.slide:A}}');
    expect(html).toContain('data-htsl-autoplay="8000"');
    expect(html).toContain("data-htsl-loop");
    expect(html).toContain("htsl-deck-play");
  });

  it("supports ms / s / m suffixes and bare seconds", () => {
    expect(parseDurationMs("500ms")).toBe(500);
    expect(parseDurationMs("8s")).toBe(8000);
    expect(parseDurationMs("8")).toBe(8000); // bare number = seconds
    expect(parseDurationMs("2m")).toBe(120000);
    expect(parseDurationMs("0")).toBe(0);
    expect(parseDurationMs("nope")).toBe(0);
    expect(parseDurationMs(undefined)).toBe(0);
  });

  it("validates the transition name", () => {
    expect(deckTransition("zoom")).toBe("zoom");
    expect(deckTransition("SLIDE")).toBe("slide");
    expect(deckTransition("")).toBe("none");
    expect(deckTransition("nope")).toBe("none");
  });
});
