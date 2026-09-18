import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

describe("{@document} — paged document for print / PDF", () => {
  it("wraps its {@page} children as sheets (default a4, flow mode)", () => {
    const html = compile("{@document:{@page:{p:un}}{@page:{p:deux}}}");
    expect(html).toContain('class="htsl-doc htsl-doc--a4"');
    expect(html).toContain("data-htsl-doc");
    const pages = [...html.matchAll(/class="htsl-doc-page"/g)];
    expect(pages).toHaveLength(2);
    expect(html).toContain('<section class="htsl-doc-page" data-htsl-page="1"><p>un</p></section>');
  });

  it("includes a download-as-PDF button (wired by the trusted runtime)", () => {
    const html = compile("{@document:{@page:{p:x}}}");
    expect(html).toContain('class="htsl-doc-pdf"');
    expect(html).toContain("data-htsl-pdf");
  });

  it("numbers pages sequentially and honours the numbers attribute", () => {
    const html = compile("{@document[numbers=true]:{@page:{p:a}}{@page:{p:b}}{@page:{p:c}}}");
    expect(html).toContain("htsl-doc--numbered");
    const nums = [...html.matchAll(/data-htsl-page="(\d+)"/g)].map((m) => m[1]);
    expect(nums).toEqual(["1", "2", "3"]);
  });

  it("supports the letter and a5 formats", () => {
    expect(compile("{@document[format=letter]:{@page:x}}")).toContain("htsl-doc--letter");
    expect(compile("{@document[format=a5]:{@page:x}}")).toContain("htsl-doc--a5");
  });

  it("falls back to a4 for an unknown format", () => {
    expect(compile("{@document[format=poster]:{@page:x}}")).toContain("htsl-doc--a4");
  });

  it("ignores non-page children when numbering", () => {
    const html = compile("{@document:{@page:{p:a}}{p:hors-page}{@page:{p:b}}}");
    const nums = [...html.matchAll(/data-htsl-page="(\d+)"/g)].map((m) => m[1]);
    expect(nums).toEqual(["1", "2"]);
  });

  it("supports the aliases livre / pages and page / feuille", () => {
    expect(compile("{@livre:{@feuille:x}}")).toContain("htsl-doc-page");
    expect(compile("{@pages:{@page:x}}")).toContain('class="htsl-doc');
  });

  it("renders a standalone {@page} with no number outside a document", () => {
    const html = compile("{@page:{p:x}}");
    expect(html).toContain('<section class="htsl-doc-page"><p>x</p></section>');
    expect(html).not.toContain("data-htsl-page");
  });
});

describe("{@document[mode=book]} — flip reader", () => {
  it("adds the book scaffold (stage, nav, index) in book mode", () => {
    const html = compile("{@document[mode=book]:{@page:{p:a}}{@page:{p:b}}}");
    expect(html).toContain("htsl-doc--book");
    expect(html).toContain("data-htsl-book");
    expect(html).toContain('data-htsl-book-index="0"');
    expect(html).toContain('class="htsl-book-stage"');
    expect(html).toContain("htsl-book-prev");
    expect(html).toContain("htsl-book-next");
    expect(html).toContain('<span class="htsl-book-counter">1 / 2</span>');
  });

  it("stays a plain stack (no book scaffold) in the default flow mode", () => {
    const html = compile("{@document:{@page:{p:a}}}");
    expect(html).not.toContain("htsl-doc--book");
    expect(html).not.toContain("data-htsl-book");
  });
});
