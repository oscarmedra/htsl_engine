/**
 * HTSL lexer.
 *
 * The lexer is mode-aware. It starts in `content` mode (raw text + element/
 * comment boundaries) and switches to `header` mode between `{` and the `:` /
 * `/}` that ends an element header, where it emits structural tokens
 * (identifiers, `.`, `#`, `[`, `]`, `=`, `,`, strings).
 *
 * In `strict` mode purely lexical problems (unterminated comment / string)
 * throw an {@link HTSLError}. In `tolerant` mode the lexer recovers so it never
 * throws, leaving structural error reporting to the parser.
 */
import { HTSLError } from "./errors.js";
import type { Loc, ParseMode, Token, TokenType } from "./types.js";

const IDENT_CHAR = /[A-Za-z0-9_-]/;

export function tokenize(source: string, mode: ParseMode = "strict"): Token[] {
  return new Lexer(source, mode).run();
}

class Lexer {
  private pos = 0;
  private line = 1;
  private col = 1;
  private mode: "content" | "header" = "content";
  private readonly tokens: Token[] = [];
  private readonly tolerant: boolean;

  constructor(
    private readonly src: string,
    parseMode: ParseMode,
  ) {
    this.tolerant = parseMode === "tolerant";
  }

  run(): Token[] {
    while (!this.eof()) {
      if (this.mode === "content") this.lexContent();
      else this.lexHeader();
    }
    this.push("EOF", "");
    return this.tokens;
  }

  /* ----------------------------------------------------------------------- */
  /* Content mode                                                            */
  /* ----------------------------------------------------------------------- */

  private lexContent(): void {
    if (this.startsWith("{!--")) {
      this.lexComment();
      return;
    }
    const ch = this.peek();
    if (ch === "{") {
      const loc = this.loc();
      this.advance();
      this.push("LBRACE", "{", loc);
      this.mode = "header";
      return;
    }
    if (ch === "}") {
      const loc = this.loc();
      this.advance();
      this.push("RBRACE", "}", loc);
      this.mode = "content";
      return;
    }
    this.lexText();
  }

  private lexText(): void {
    const loc = this.loc();
    let value = "";
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === "\\") {
        const next = this.peek(1);
        if (next === "{" || next === "}" || next === ":") {
          this.advance(); // backslash
          value += this.advance(); // the escaped character, taken literally
          continue;
        }
        value += this.advance(); // lone backslash, kept as-is
        continue;
      }
      if (ch === "{" || ch === "}") break;
      value += this.advance();
    }
    this.push("TEXT", value, loc);
  }

  private lexComment(): void {
    const loc = this.loc();
    // consume "{!--"
    this.advance();
    this.advance();
    this.advance();
    this.advance();
    let value = "";
    while (!this.eof() && !this.startsWith("--}")) {
      value += this.advance();
    }
    if (this.eof()) {
      if (this.tolerant) {
        this.push("COMMENT", value, loc);
        this.mode = "content";
        return;
      }
      throw new HTSLError("commentaire jamais fermé.", loc, this.src);
    }
    // consume "--}"
    this.advance();
    this.advance();
    this.advance();
    this.push("COMMENT", value, loc);
    this.mode = "content";
  }

  /* ----------------------------------------------------------------------- */
  /* Header mode                                                             */
  /* ----------------------------------------------------------------------- */

  private lexHeader(): void {
    const ch = this.peek();
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      this.advance();
      return;
    }
    const loc = this.loc();
    switch (ch) {
      case "}":
        this.advance();
        this.push("RBRACE", "}", loc);
        this.mode = "content";
        return;
      case ":":
        this.advance();
        this.push("COLON", ":", loc);
        this.mode = "content";
        return;
      case "/":
        this.advance();
        this.push("SLASH", "/", loc);
        return;
      case "#":
        this.advance();
        this.push("HASH", "#", loc);
        return;
      case ".":
        this.advance();
        this.push("DOT", ".", loc);
        return;
      case "[":
        this.advance();
        this.push("LBRACKET", "[", loc);
        return;
      case "]":
        this.advance();
        this.push("RBRACKET", "]", loc);
        return;
      case "=":
        this.advance();
        this.push("EQUALS", "=", loc);
        return;
      case ",":
        this.advance();
        this.push("COMMA", ",", loc);
        return;
      case '"':
        this.lexString();
        return;
      default:
        if (IDENT_CHAR.test(ch)) {
          this.lexIdent();
          return;
        }
        if (this.tolerant) {
          this.advance(); // drop the stray character and keep going
          return;
        }
        throw new HTSLError(
          `caractère inattendu "${ch}" dans l'en-tête de balise.`,
          loc,
          this.src,
        );
    }
  }

  private lexIdent(): void {
    const loc = this.loc();
    let value = "";
    while (!this.eof() && IDENT_CHAR.test(this.peek())) {
      value += this.advance();
    }
    this.push("IDENT", value, loc);
  }

  private lexString(): void {
    const loc = this.loc();
    this.advance(); // opening quote
    let value = "";
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === "\\") {
        const next = this.peek(1);
        if (next === '"' || next === "\\") {
          this.advance();
          value += this.advance();
          continue;
        }
        value += this.advance();
        continue;
      }
      if (ch === '"') {
        this.advance(); // closing quote
        this.push("STRING", value, loc);
        return;
      }
      value += this.advance();
    }
    // reached EOF without a closing quote
    if (this.tolerant) {
      this.push("STRING", value, loc);
      return;
    }
    throw new HTSLError("chaîne de caractères non terminée.", loc, this.src);
  }

  /* ----------------------------------------------------------------------- */
  /* Primitives                                                              */
  /* ----------------------------------------------------------------------- */

  private eof(): boolean {
    return this.pos >= this.src.length;
  }

  /** Returns the character at `pos + offset`, or "" past the end of input. */
  private peek(offset = 0): string {
    return this.src[this.pos + offset] ?? "";
  }

  private startsWith(text: string): boolean {
    return this.src.startsWith(text, this.pos);
  }

  private advance(): string {
    const ch = this.src[this.pos];
    if (ch === undefined) return "";
    this.pos++;
    if (ch === "\n") {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  private loc(): Loc {
    return { line: this.line, col: this.col };
  }

  private push(type: TokenType, value: string, loc: Loc = this.loc()): void {
    this.tokens.push({ type, value, loc });
  }
}
