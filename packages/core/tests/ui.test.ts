import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

describe("{@reveal} (collapsible)", () => {
  it("renders a native <details> with the title as summary (zero JS)", () => {
    const html = compile('{@reveal[title="Correction"]: {p:c = 5}}');
    expect(html).toContain('<details class="htsl-reveal">');
    expect(html).toContain('class="htsl-reveal-summary">Correction<');
    expect(html).toContain("<p>c = 5</p>");
    expect(html).not.toContain("<script>");
  });

  it("defaults the title to « Solution » and honours open=true", () => {
    expect(compile("{@reveal: x}")).toContain(">Solution<");
    expect(compile("{@reveal[open=true]: x}")).toContain("<details class=\"htsl-reveal\" open>");
  });
});

describe("{@tabs}", () => {
  it("renders a declarative tabs node with one button + panel per tab", () => {
    const html = compile(
      '{@tabs: {@tabs.tab[title="Énoncé"]: {p:E}} {@tabs.tab[title="Indice"]: {p:I}} {@tabs.tab[title="Solution"]: {p:S}}}',
    );
    expect(html).toContain("data-htsl-tabs");
    expect(html).toContain('data-htsl-tab="0"');
    expect(html.match(/htsl-tab-btn/g)).toHaveLength(3);
    expect(html.match(/htsl-tab-panel/g)).toHaveLength(3);
    expect(html).toContain('data-htsl-tab-to="2">Solution<');
  });

  it("labels untitled tabs and ignores non-tab children", () => {
    const html = compile("{@tabs: {@tabs.tab: {p:A}} {p:ignoré}}");
    expect(html.match(/htsl-tab-panel/g)).toHaveLength(1);
    expect(html).toContain(">Onglet 1<");
    expect(html).not.toContain("ignoré");
  });
});
