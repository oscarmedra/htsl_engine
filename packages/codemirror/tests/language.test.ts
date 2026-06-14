import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { getIndentation, foldable } from "@codemirror/language";
import { htslTokens, htslLanguage } from "../src/language.js";

const find = (src: string, text: string) => htslTokens(src).find((t) => t.text === text);
const types = (src: string) => htslTokens(src).map((t) => t.type);

describe("htsl tokenizer — structure", () => {
  it("colours tag, class and id in a header", () => {
    expect(find("{div.box#id:hi}", "div")?.type).toBe("tag");
    expect(find("{div.box#id:hi}", ".box")?.type).toBe("class");
    expect(find("{div.box#id:hi}", "#id")?.type).toBe("id");
  });

  it("colours braces", () => {
    expect(find("{p:x}", "{")?.type).toBe("brace");
    expect(find("{p:x}", "}")?.type).toBe("brace");
  });

  it("distinguishes attribute names, values and strings", () => {
    expect(find('{a[href="/x", k=v]:y}', "href")?.type).toBe("attr");
    expect(find('{a[href="/x", k=v]:y}', '"/x"')?.type).toBe("string");
    expect(find('{a[href="/x", k=v]:y}', "v")?.type).toBe("value");
  });
});

describe("htsl tokenizer — objects, directives, variables", () => {
  it("colours an object opener", () => {
    expect(find("{@mti: x^2}", "{@mti")?.type).toBe("object");
  });
  it("colours a directive", () => {
    expect(find("{!define card:x}", "{!define")?.type).toBe("directive");
  });
  it("colours a variable reference", () => {
    expect(find("{$theme}", "{$theme}")?.type).toBe("var");
  });
});

describe("htsl tokenizer — math, comments, escapes", () => {
  it("colours inline and block math", () => {
    expect(types("$x$")).toContain("math");
    expect(types("$$x^2$$")).toContain("math");
    expect(types("{@mtb: a+b}")).toContain("math");
  });
  it("colours a comment", () => {
    expect(find("{!-- note --}", "{!-- note --}")?.type).toBe("comment");
  });
  it("colours an escape sequence", () => {
    expect(find("a\\{b", "\\{")?.type).toBe("escape");
  });
});

describe("htsl indentation", () => {
  // Indentation derives from brace-nesting depth (unit = 2 spaces by default).
  const indentAt = (doc: string, line: number): number | null => {
    const state = EditorState.create({ doc, extensions: [htslLanguage()] });
    const ln = state.doc.line(line);
    return getIndentation(state, ln.from);
  };

  it("indents a line inside one open block by one unit", () => {
    // line 2 sits inside `{div: … }`
    expect(indentAt("{div:\nx\n}", 2)).toBe(2);
  });

  it("indents deeper for nested blocks", () => {
    expect(indentAt("{ul:\n{li:\nx\n}\n}", 3)).toBe(4);
  });

  it("dedents a line that starts with a closing brace", () => {
    expect(indentAt("{div:\nx\n}", 3)).toBe(0);
  });

  it("is zero at the top level", () => {
    expect(indentAt("{p:a}\nx", 2)).toBe(0);
  });
});

describe("raw-text highlighting (script / style)", () => {
  const typeOf = (src: string, text: string) =>
    htslTokens(src).find((t) => t.text === text)?.type;

  it("colours JS keywords, numbers, strings and comments in {script:…}", () => {
    const src = `{script:const x=1; // c\nif(a){f();}}`;
    expect(typeOf(src, "const")).toBe("keyword");
    expect(typeOf(src, "1")).toBe("number");
    expect(typeOf(src, "if")).toBe("keyword");
    expect(typeOf(src, "// c")).toBe("comment");
  });

  it("does not let a brace inside a JS string close the element", () => {
    // The string "}" must stay a string; the two trailing } close if + script.
    const toks = htslTokens(`{script:if(a){g("}");}}`);
    expect(toks.find((t) => t.text === '"}"')?.type).toBe("string");
    // HTSL fully consumed (no leftover content frame): last token closes script.
    expect(toks[toks.length - 1]?.type).toBe("brace");
  });

  it("resumes HTSL after the script element", () => {
    const toks = htslTokens(`{div:{script:let a={b:1};}{p:x}}`);
    // "p" appears as an HTSL tag *after* the raw script body.
    expect(toks.filter((t) => t.type === "tag").map((t) => t.text)).toEqual([
      "div",
      "script",
      "p",
    ]);
  });

  it("treats {style:…} as raw (no // comments, CSS braces balanced)", () => {
    const toks = htslTokens(`{style:.a { color: red; } }`);
    // The CSS braces are structural braces, and the element still closes.
    expect(toks[toks.length - 1]?.type).toBe("brace");
  });
});

describe("code folding", () => {
  const foldOf = (src: string, lineNo: number) => {
    const state = EditorState.create({ doc: src, extensions: [htslLanguage()] });
    const line = state.doc.line(lineNo);
    return foldable(state, line.from, line.to);
  };

  it("folds a multi-line {…} block from the opening line to its closing brace", () => {
    const src = "{div:\n  {p:hi}\n}";
    const r = foldOf(src, 1);
    expect(r).not.toBeNull();
    // folds from end of line 1 to the closing brace on line 3
    expect(r!.from).toBe(state_end_of_line1(src));
    expect(src[r!.to]).toBe("}");
  });

  it("does not fold a single-line block", () => {
    expect(foldOf("{p:hello}", 1)).toBeNull();
  });

  it("ignores braces inside strings when matching", () => {
    const src = '{div[data-x="a}b"]:\n  text\n}';
    const r = foldOf(src, 1);
    expect(r).not.toBeNull();
    expect(src[r!.to]).toBe("}"); // the real closing brace, not the one in the string
  });

  it("handles nested blocks (folds the outer to the outer close)", () => {
    const src = "{section:\n  {div:\n    x\n  }\n}";
    const r = foldOf(src, 1);
    expect(r).not.toBeNull();
    expect(r!.to).toBe(src.length - 1); // last char is the outer "}"
  });
});

function state_end_of_line1(src: string): number {
  return src.indexOf("\n");
}
