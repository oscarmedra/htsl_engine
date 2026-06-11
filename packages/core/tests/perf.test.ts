import { describe, expect, it, beforeEach } from "vitest";
import { compile, render, parse, htslHash, clearKatexCache } from "../src/index.js";
import type { KatexLike } from "../src/types.js";

const HASH = /data-htsl-hash="[a-z0-9]+"/;

describe("hashBlocks option", () => {
  it("is off by default (no data-htsl-hash)", () => {
    expect(compile("{div.box:hi}")).not.toMatch(HASH);
  });

  it("stamps a hash on top-level elements", () => {
    const html = compile("{div.box:hi}{p:x}", { hashBlocks: true });
    expect((html.match(/data-htsl-hash=/g) ?? []).length).toBe(2);
  });

  it("does not hash nested elements (only top-level)", () => {
    const html = compile("{div:{span:a}{span:b}}", { hashBlocks: true });
    expect((html.match(/data-htsl-hash=/g) ?? []).length).toBe(1);
  });

  it("stamps a hash on math blocks and equations", () => {
    expect(compile("{@mtb: x^2}", { hashBlocks: true })).toMatch(HASH);
    expect(compile("{@mte[label=e]: E=mc^2}", { hashBlocks: true })).toMatch(HASH);
    // even nested inside a paragraph
    expect(compile("{p:texte {@mti: x} fin}", { hashBlocks: true })).toMatch(HASH);
  });

  it("stamps a hash on scenes", () => {
    expect(compile(`{@mg2.scene:{@mg2.circle[center="(0,0)", radius=1]/}}`, { hashBlocks: true })).toMatch(HASH);
  });

  it("produces a stable hash across renders, changing only when content changes", () => {
    const a = compile("{p:hello}", { hashBlocks: true });
    const b = compile("{p:hello}", { hashBlocks: true });
    const c = compile("{p:world}", { hashBlocks: true });
    const h = (s: string) => s.match(/data-htsl-hash="([a-z0-9]+)"/)?.[1];
    expect(h(a)).toBe(h(b));
    expect(h(a)).not.toBe(h(c));
  });
});

describe("htslHash", () => {
  it("is identical for identical subtrees and differs otherwise", () => {
    const [a] = parse("{div.box:hello}");
    const [b] = parse("{div.box:hello}");
    const [c] = parse("{div.box:world}");
    expect(htslHash(a!)).toBe(htslHash(b!));
    expect(htslHash(a!)).not.toBe(htslHash(c!));
  });
});

describe("KaTeX memoization", () => {
  beforeEach(() => clearKatexCache());

  function counting(): { katex: KatexLike; calls: () => number } {
    let n = 0;
    return {
      katex: {
        renderToString(tex) {
          n += 1;
          return `<k>${tex}</k>`;
        },
      },
      calls: () => n,
    };
  }

  it("renders a repeated formula through KaTeX only once", () => {
    const { katex, calls } = counting();
    const src = "{p:$zzz1$ et encore $zzz1$ et $zzz1$}";
    render(parse(src), { katex });
    expect(calls()).toBe(1); // same inline formula → one KaTeX call
  });

  it("does not call KaTeX again on a re-render of the same formula", () => {
    const { katex, calls } = counting();
    render(parse("{@mtb: zzz2}"), { katex });
    render(parse("{@mtb: zzz2}"), { katex });
    expect(calls()).toBe(1);
  });

  it("distinguishes inline vs display mode and different formulas", () => {
    const { katex, calls } = counting();
    render(parse("$zzz3$"), { katex }); // inline
    render(parse("$$zzz3$$"), { katex }); // display — different cache key
    render(parse("$zzz4$"), { katex }); // different formula
    expect(calls()).toBe(3);
  });
});
