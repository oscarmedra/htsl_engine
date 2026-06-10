import { describe, expect, it } from "vitest";
import { tokenize } from "../src/lexer.js";
import { HTSLError } from "../src/errors.js";
import type { Token, TokenType } from "../src/types.js";

/** Helper: compact a token stream to [type, value] pairs (drops trailing EOF). */
function pairs(tokens: Token[]): Array<[TokenType, string]> {
  return tokens.filter((t) => t.type !== "EOF").map((t) => [t.type, t.value]);
}

describe("lexer — token types", () => {
  it("tokenizes a simple element", () => {
    expect(pairs(tokenize("{p:Bonjour}"))).toEqual([
      ["LBRACE", "{"],
      ["IDENT", "p"],
      ["COLON", ":"],
      ["TEXT", "Bonjour"],
      ["RBRACE", "}"],
    ]);
  });

  it("tokenizes classes and id", () => {
    expect(pairs(tokenize("{div#main.box.red:x}"))).toEqual([
      ["LBRACE", "{"],
      ["IDENT", "div"],
      ["HASH", "#"],
      ["IDENT", "main"],
      ["DOT", "."],
      ["IDENT", "box"],
      ["DOT", "."],
      ["IDENT", "red"],
      ["COLON", ":"],
      ["TEXT", "x"],
      ["RBRACE", "}"],
    ]);
  });

  it("tokenizes attributes with quoted and unquoted values", () => {
    expect(pairs(tokenize('{a[href=x, title="val 2"]:t}'))).toEqual([
      ["LBRACE", "{"],
      ["IDENT", "a"],
      ["LBRACKET", "["],
      ["IDENT", "href"],
      ["EQUALS", "="],
      ["IDENT", "x"],
      ["COMMA", ","],
      ["IDENT", "title"],
      ["EQUALS", "="],
      ["STRING", "val 2"],
      ["RBRACKET", "]"],
      ["COLON", ":"],
      ["TEXT", "t"],
      ["RBRACE", "}"],
    ]);
  });

  it("tokenizes a self-closing element", () => {
    expect(pairs(tokenize('{img[src="a.png"]/}'))).toEqual([
      ["LBRACE", "{"],
      ["IDENT", "img"],
      ["LBRACKET", "["],
      ["IDENT", "src"],
      ["EQUALS", "="],
      ["STRING", "a.png"],
      ["RBRACKET", "]"],
      ["SLASH", "/"],
      ["RBRACE", "}"],
    ]);
  });

  it("tokenizes a comment as a single token", () => {
    const tokens = tokenize("{!-- hello --}");
    expect(pairs(tokens)).toEqual([["COMMENT", " hello "]]);
  });

  it("always ends with an EOF token", () => {
    const tokens = tokenize("{p:x}");
    expect(tokens[tokens.length - 1]?.type).toBe("EOF");
  });
});

describe("lexer — escapes", () => {
  it("unescapes \\{ \\} \\: in text", () => {
    const tokens = tokenize("a\\{b\\}c\\:d");
    expect(pairs(tokens)).toEqual([["TEXT", "a{b}c:d"]]);
  });

  it("keeps a lone backslash literally", () => {
    expect(pairs(tokenize("a\\b"))).toEqual([["TEXT", "a\\b"]]);
  });

  it("handles escapes inside quoted attribute values", () => {
    const tokens = tokenize('{a[t="x\\"y"]:z}');
    const str = tokens.find((t) => t.type === "STRING");
    expect(str?.value).toBe('x"y');
  });
});

describe("lexer — positions", () => {
  it("reports 1-based line/col for the opening brace", () => {
    const tokens = tokenize("ab{p:x}");
    const lbrace = tokens.find((t) => t.type === "LBRACE");
    expect(lbrace?.loc).toEqual({ line: 1, col: 3 });
  });

  it("tracks line and column across newlines", () => {
    const src = "line1\n  {p:x}";
    const tokens = tokenize(src);
    const lbrace = tokens.find((t) => t.type === "LBRACE");
    expect(lbrace?.loc).toEqual({ line: 2, col: 3 });
  });

  it("places text token at the start of the run", () => {
    const tokens = tokenize("{p:Bonjour}");
    const text = tokens.find((t) => t.type === "TEXT");
    expect(text?.loc).toEqual({ line: 1, col: 4 });
  });
});

describe("lexer — error handling", () => {
  it("throws on an unterminated comment in strict mode", () => {
    expect(() => tokenize("{!-- never closed", "strict")).toThrow(HTSLError);
  });

  it("throws on an unterminated string in strict mode", () => {
    expect(() => tokenize('{a[x="oops]:y}', "strict")).toThrow(HTSLError);
  });

  it("recovers from an unterminated comment in tolerant mode", () => {
    expect(() => tokenize("{!-- never closed", "tolerant")).not.toThrow();
  });
});
