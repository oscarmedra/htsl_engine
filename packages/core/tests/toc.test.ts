import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

// B2 — {@toc} builds a table of contents from the headings, with links.
describe("{@toc} — automatic table of contents", () => {
  const src = "{@toc[title=\"Sommaire\"]/}{h1:Intro}{h2:Contexte}{h1:Méthode}{h3:Détail}";

  it("lists headings up to the default depth (3) with links", () => {
    const html = compile(src);
    expect(html).toContain('<nav class="htsl-toc">');
    expect(html).toContain('<div class="htsl-toc-title">Sommaire</div>');
    expect(html).toContain('<a href="#intro">Intro</a>');
    expect(html).toContain('<a href="#contexte">Contexte</a>');
    expect(html).toContain('<a href="#detail">Détail</a>');
  });

  it("stamps slug ids on the headings", () => {
    const html = compile(src);
    expect(html).toContain('<h1 id="intro">Intro</h1>');
    expect(html).toContain('<h2 id="contexte">Contexte</h2>');
  });

  it("respects the levels cap", () => {
    const html = compile("{@toc[levels=1]/}{h1:A}{h2:B}{h3:C}");
    expect(html).toContain('href="#a"');
    expect(html).not.toContain('href="#b"');
  });

  it("does not inject ids when there is no {@toc}", () => {
    expect(compile("{h1:Sans toc}")).toBe("<h1>Sans toc</h1>");
  });

  it("keeps a unique id for duplicate heading texts", () => {
    const html = compile("{@toc/}{h1:Partie}{h1:Partie}");
    expect(html).toContain('id="partie"');
    expect(html).toContain('id="partie-2"');
  });
});
