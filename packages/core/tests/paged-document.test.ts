import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

describe("{@document} — paged document for print / PDF", () => {
  it("wraps its {@page} children as sheets (default a4, flow mode)", () => {
    const html = compile("{@document:{@page:{p:un}}{@page:{p:deux}}}");
    expect(html).toContain('class="htsl-doc htsl-doc--a4"');
    expect(html).toContain("data-htsl-doc");
    const pages = [...html.matchAll(/class="htsl-doc-page"/g)];
    expect(pages).toHaveLength(2);
    expect(html).toContain(
      '<section class="htsl-doc-page" data-htsl-page="1"><div class="htsl-doc-content"><p>un</p></div></section>',
    );
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

  it("sets the sheet size as CSS variables from the named format", () => {
    const a3 = compile("{@document[format=a3]:{@page:x}}");
    expect(a3).toContain("htsl-doc--a3");
    expect(a3).toContain("--htsl-doc-w:297mm");
    expect(a3).toContain("--htsl-doc-h:420mm");
  });

  it("accepts a custom size (mm default, cm, in) — quoted", () => {
    expect(compile('{@document[format="300x400"]:{@page:x}}')).toContain("--htsl-doc-w:300mm;--htsl-doc-h:400mm");
    expect(compile('{@document[format="30x40cm"]:{@page:x}}')).toContain("--htsl-doc-w:300mm;--htsl-doc-h:400mm");
    const inch = compile('{@document[format="8.5x11in"]:{@page:x}}');
    expect(inch).toContain("--htsl-doc-w:215.9mm");
    expect(inch).toContain("htsl-doc--custom");
  });

  it("supports landscape presentation formats (16:9 and 4:3)", () => {
    const s = compile("{@document[format=slide]:{@page:x}}");
    expect(s).toContain("htsl-doc--slide");
    expect(s).toContain("--htsl-doc-w:338.67mm;--htsl-doc-h:190.5mm");
    expect(compile("{@document[format=slide43]:{@page:x}}")).toContain("--htsl-doc-w:254mm;--htsl-doc-h:190.5mm");
    expect(compile("{@document[format=diapo]:{@page:x}}")).toContain("htsl-doc--diapo");
  });

  it("falls back to a4 for an unknown format", () => {
    const html = compile("{@document[format=banana]:{@page:x}}");
    expect(html).toContain("htsl-doc--a4");
    expect(html).toContain("--htsl-doc-w:210mm;--htsl-doc-h:297mm");
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

  it("renders a standalone {@page} with no number/header/footer/grid outside a document", () => {
    const html = compile("{@page[grid=lines, header=X]:{p:x}}");
    expect(html).toContain('<section class="htsl-doc-page"><p>x</p></section>');
    expect(html).not.toContain("data-htsl-page");
    expect(html).not.toContain("htsl-doc-head"); // options only live inside {@document}
    expect(html).not.toContain("grid-lines");
  });
});

describe("{@document} — grid, header & footer", () => {
  it("applies a document-level grid, header and footer to every page", () => {
    const html = compile(
      '{@document[grid=lines, header="Mon livre", footer="© 2026"]:{@page:{p:a}}{@page:{p:b}}}',
    );
    expect([...html.matchAll(/htsl-doc-page--grid-lines/g)]).toHaveLength(2);
    expect([...html.matchAll(/<div class="htsl-doc-head">Mon livre<\/div>/g)]).toHaveLength(2);
    expect([...html.matchAll(/htsl-doc-foot-text">© 2026</g)]).toHaveLength(2);
  });

  it("lets a page override the document header/footer/grid", () => {
    const html = compile(
      '{@document[grid=lines, header="Défaut"]:{@page[header="Spécial", grid=dots]:{p:a}}}',
    );
    expect(html).toContain('<div class="htsl-doc-head">Spécial</div>');
    expect(html).not.toContain("Défaut");
    expect(html).toContain("htsl-doc-page--grid-dots");
    expect(html).not.toContain("grid-lines");
  });

  it("puts the page number in the footer when numbers=true", () => {
    const html = compile("{@document[numbers=true]:{@page:{p:a}}{@page:{p:b}}}");
    const nums = [...html.matchAll(/htsl-doc-num">(\d+)</g)].map((m) => m[1]);
    expect(nums).toEqual(["1", "2"]);
  });

  it("maps the grid aliases grille/lignes and rejects unknown values", () => {
    expect(compile("{@document[grid=grille]:{@page:x}}")).toContain("grid-squares");
    expect(compile("{@document[grid=lignes]:{@page:x}}")).toContain("grid-lines");
    expect(compile("{@document[grid=zigzag]:{@page:x}}")).not.toContain("htsl-doc-page--grid");
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
