import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";

describe("{@columns} — side-by-side layout", () => {
  it("renders one .htsl-col per {@col} and sets the column count", () => {
    const html = compile("{@columns:{@col:{p:A}}{@col:{p:B}}{@col:{p:C}}}");
    expect(html).toContain("--htsl-cols:3");
    expect(html.match(/htsl-col"/g)).toHaveLength(3);
    expect(html).toContain("<p>A</p>");
  });
  it("supports the {@col} / {@colonne} aliases", () => {
    expect(compile("{@columns:{@colonne:x}}")).toContain('class="htsl-col"');
  });
});

describe("{@deflist} — glossary", () => {
  it("maps {term}/{def} to <dt>/<dd> in order", () => {
    expect(compile("{@deflist:{term:Vitesse}{def:d/t}{term:Accél}{def:dv}}")).toBe(
      '<dl class="htsl-deflist"><dt>Vitesse</dt><dd>d/t</dd><dt>Accél</dt><dd>dv</dd></dl>',
    );
  });
});

describe("{@timeline} — chronology", () => {
  it("renders an event with its date and a dot", () => {
    const html = compile('{@timeline:{@event[date="1905"]:{p:Einstein}}}');
    expect(html).toContain('class="htsl-timeline"');
    expect(html).toContain('<div class="htsl-tl-date">1905</div>');
    expect(html).toContain("htsl-tl-dot");
    expect(html).toContain("<p>Einstein</p>");
  });
  it("ignores non-event children", () => {
    const html = compile("{@timeline:{@event:{p:a}}{p:ignoré}{@event:{p:b}}}");
    expect(html.match(/htsl-tl-event/g)).toHaveLength(2);
  });
});

describe("{@mark} & {@badge}", () => {
  it("{@mark} wraps content in <mark>", () => {
    expect(compile("{p:un {@mark:mot} clé}")).toContain('<mark class="htsl-mark">mot</mark>');
  });
  it("{@badge} is a coloured inline pill; unknown color → slate", () => {
    expect(compile("{@badge[color=green]:Neuf}")).toContain('class="htsl-badge htsl-badge--green"');
    expect(compile("{@badge[color=fuchsia]:x}")).toContain("htsl-badge--slate");
  });
  it("supports the {@pill} / {@tag} aliases", () => {
    for (const a of ["pill", "tag"]) {
      expect(compile(`{@${a}:x}`), a).toContain('class="htsl-badge');
    }
  });
});
