import { describe, expect, it } from "vitest";
import { htslTokens } from "../src/language.js";

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
