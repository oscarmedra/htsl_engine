/**
 * HTSL lexer.
 *
 * The lexer is context-aware via a frame stack:
 *
 *   - "content" : ordinary HTSL content (text + element/object/comment boundaries)
 *   - "header"  : inside an element/object header, between `{`(or `{@path`) and
 *                 the `:` / `/}` that closes it — emits structural tokens
 *   - "math"    : the body of a math object, read as raw LaTeX (literal `{}` are
 *                 LaTeX groups) with nested `{@...}` objects recognised
 *
 * Objects use `{@path...}`; the shorthands `$...$` and `$$...$$` are lexed into
 * the exact same token shape as `{@math.text.inline:...}` /
 * `{@math.text.block:...}` so there is a single downstream path.
 *
 * In `strict` mode purely lexical problems (unterminated comment / string /
 * formula) throw an {@link HTSLError}; in `tolerant` mode the lexer recovers.
 */
import { HTSLError } from "./errors.js";
import { contentModelOf } from "./objects/registry.js";
import type { Loc, ParseMode, Token, TokenType } from "./types.js";

const IDENT_CHAR = /[A-Za-z0-9_-]/;
const PATH_CHAR = /[A-Za-z0-9_.-]/;

type Frame =
  | { kind: "content" }
  | { kind: "header"; path: string | null; tag?: string; directive?: boolean }
  | { kind: "math"; closer: "brace" | "dollar" | "ddollar"; depth: number };

/** Plain element tags whose body is read as LaTeX (math container rows). */
const MATH_ROW_TAGS = new Set(["line", "case"]);

export function tokenize(source: string, mode: ParseMode = "strict"): Token[] {
  return new Lexer(source, mode).run();
}

class Lexer {
  private pos = 0;
  private line = 1;
  private col = 1;
  private readonly tokens: Token[] = [];
  private readonly tolerant: boolean;
  private readonly stack: Frame[] = [{ kind: "content" }];

  constructor(
    private readonly src: string,
    parseMode: ParseMode,
  ) {
    this.tolerant = parseMode === "tolerant";
  }

  run(): Token[] {
    while (!this.eof()) {
      const before = this.pos;
      const depth = this.stack.length;
      const frame = this.top();
      if (frame.kind === "content") this.lexContent();
      else if (frame.kind === "header") this.lexHeader(frame);
      else this.lexMath(frame);
      // Safety: guarantee forward progress.
      if (this.pos === before && this.stack.length === depth) this.advance();
    }
    this.push("EOF", "");
    return this.tokens;
  }

  /* ----------------------------------------------------------------------- */
  /* Content frame                                                           */
  /* ----------------------------------------------------------------------- */

  private lexContent(): void {
    if (this.startsWith("{!--")) {
      this.lexComment();
      return;
    }
    const ch = this.peek();
    if (ch === "{") {
      const braceLoc = this.loc();
      const next = this.peek(1);
      if (next === "@") {
        this.advance(); // {
        this.advance(); // @
        const path = this.readPath();
        this.push("OBJOPEN", path, braceLoc);
        this.stack.push({ kind: "header", path });
      } else if (next === "$") {
        this.lexVarRef(braceLoc);
      } else if (next === "!") {
        this.lexDirective(braceLoc); // {!-- already handled above
      } else {
        this.advance();
        this.push("LBRACE", "{", braceLoc);
        this.stack.push({ kind: "header", path: null });
      }
      return;
    }
    if (ch === "}") {
      const loc = this.loc();
      this.advance();
      this.push("RBRACE", "}", loc);
      this.popContent();
      return;
    }
    if (ch === "$") {
      this.openDollar();
      return;
    }
    this.lexText();
  }

  /** Emit the object header for a `$...$` / `$$...$$` shorthand. */
  private openDollar(): void {
    const loc = this.loc();
    if (this.peek(1) === "$") {
      this.advance();
      this.advance();
      this.push("OBJOPEN", "math.text.block", loc);
      this.push("COLON", ":", loc);
      this.stack.push({ kind: "math", closer: "ddollar", depth: 0 });
    } else {
      this.advance();
      this.push("OBJOPEN", "math.text.inline", loc);
      this.push("COLON", ":", loc);
      this.stack.push({ kind: "math", closer: "dollar", depth: 0 });
    }
  }

  private lexVarRef(braceLoc: Loc): void {
    this.advance(); // {
    this.advance(); // $
    const name = this.readVarName();
    if (this.peek() === "}") {
      this.advance();
    } else if (!this.tolerant) {
      throw new HTSLError("référence de variable malformée (} attendu).", braceLoc, this.src);
    }
    this.push("VARREF", name, braceLoc);
  }

  private lexDirective(braceLoc: Loc): void {
    this.advance(); // {
    this.advance(); // !
    const keyword = this.readKeyword();
    if (keyword === "define") {
      this.skipSpaces();
      const name = this.readPath();
      this.push("DEFINE_OPEN", name, braceLoc);
      this.stack.push({ kind: "header", path: null, directive: true });
      return;
    }
    if (keyword === "set") {
      this.skipSpaces();
      const name = this.readVarName();
      this.push("SET_OPEN", name, braceLoc);
      this.stack.push({ kind: "header", path: null, directive: true });
      return;
    }
    if (this.tolerant) {
      while (!this.eof() && this.peek() !== "}") this.advance();
      if (this.peek() === "}") this.advance();
      return;
    }
    throw new HTSLError(`directive inconnue : "!${keyword}".`, braceLoc, this.src);
  }

  private lexText(): void {
    const loc = this.loc();
    let value = "";
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === "\\") {
        const next = this.peek(1);
        if (next === "{" || next === "}" || next === ":" || next === "$") {
          this.advance(); // backslash
          value += this.advance(); // the escaped character, taken literally
          continue;
        }
        value += this.advance(); // lone backslash, kept as-is
        continue;
      }
      if (ch === "{" || ch === "}" || ch === "$") break;
      value += this.advance();
    }
    this.push("TEXT", value, loc);
  }

  private lexComment(): void {
    const loc = this.loc();
    this.advance(); // {
    this.advance(); // !
    this.advance(); // -
    this.advance(); // -
    let value = "";
    while (!this.eof() && !this.startsWith("--}")) value += this.advance();
    if (this.eof()) {
      if (this.tolerant) {
        this.push("COMMENT", value, loc);
        return;
      }
      throw new HTSLError("commentaire jamais fermé.", loc, this.src);
    }
    this.advance();
    this.advance();
    this.advance();
    this.push("COMMENT", value, loc);
  }

  /* ----------------------------------------------------------------------- */
  /* Header frame                                                            */
  /* ----------------------------------------------------------------------- */

  private lexHeader(frame: {
    kind: "header";
    path: string | null;
    tag?: string;
    directive?: boolean;
  }): void {
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
        this.stack.pop();
        return;
      case ":":
        this.advance();
        this.push("COLON", ":", loc);
        this.stack.pop(); // leave header
        const objectMath = frame.path !== null && contentModelOf(frame.path) === "math";
        const rowMath = frame.path === null && frame.tag !== undefined && MATH_ROW_TAGS.has(frame.tag);
        if (objectMath || rowMath) {
          this.stack.push({ kind: "math", closer: "brace", depth: 0 });
        } else {
          this.stack.push({ kind: "content" });
        }
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
        if (/[0-9]/.test(ch)) {
          // Number-like attribute value (e.g. 0.5), kept as one IDENT token.
          this.lexNumber();
          return;
        }
        if (IDENT_CHAR.test(ch)) {
          this.lexIdent();
          // The first identifier in a plain-element header is its tag name.
          if (frame.path === null && !frame.directive && frame.tag === undefined) {
            frame.tag = this.tokens[this.tokens.length - 1]!.value;
          }
          return;
        }
        if (this.tolerant) {
          this.advance();
          return;
        }
        throw new HTSLError(
          `caractère inattendu "${ch}" dans l'en-tête.`,
          loc,
          this.src,
        );
    }
  }

  private lexIdent(): void {
    const loc = this.loc();
    let value = "";
    while (!this.eof() && IDENT_CHAR.test(this.peek())) value += this.advance();
    this.push("IDENT", value, loc);
  }

  /** Lex a numeric attribute value such as `5` or `0.5` (emitted as IDENT). */
  private lexNumber(): void {
    const loc = this.loc();
    let value = "";
    while (!this.eof() && /[0-9.]/.test(this.peek())) value += this.advance();
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
        this.advance();
        this.push("STRING", value, loc);
        return;
      }
      value += this.advance();
    }
    if (this.tolerant) {
      this.push("STRING", value, loc);
      return;
    }
    throw new HTSLError("chaîne de caractères non terminée.", loc, this.src);
  }

  /* ----------------------------------------------------------------------- */
  /* Math frame                                                              */
  /* ----------------------------------------------------------------------- */

  private lexMath(frame: { kind: "math"; closer: string; depth: number }): void {
    const startLoc = this.loc();
    let value = "";
    const flush = (): void => {
      if (value.length > 0) this.push("MATH_TEXT", value, startLoc);
    };

    while (!this.eof()) {
      const ch = this.peek();

      if (ch === "\\") {
        // LaTeX escape: keep the backslash and the following char verbatim.
        value += this.advance();
        if (!this.eof()) value += this.advance();
        continue;
      }

      if (ch === "{") {
        if (this.peek(1) === "@") {
          flush();
          const braceLoc = this.loc();
          this.advance();
          this.advance();
          const path = this.readPath();
          this.push("OBJOPEN", path, braceLoc);
          this.stack.push({ kind: "header", path });
          return;
        }
        if (this.peek(1) === "$") {
          flush();
          this.lexVarRef(this.loc());
          return; // resume the math frame on the next dispatch
        }
        frame.depth++;
        value += this.advance();
        continue;
      }

      if (ch === "}") {
        if (frame.depth > 0) {
          frame.depth--;
          value += this.advance();
          continue;
        }
        flush();
        const loc = this.loc();
        this.advance();
        this.push("RBRACE", "}", loc);
        this.stack.pop();
        return;
      }

      if (ch === "$") {
        const isClose =
          (frame.closer === "ddollar" && this.peek(1) === "$") ||
          frame.closer === "dollar";
        if (isClose) {
          flush();
          const loc = this.loc();
          this.advance();
          if (frame.closer === "ddollar") this.advance();
          this.push("RBRACE", "}", loc);
          this.stack.pop();
          return;
        }
        value += this.advance();
        continue;
      }

      value += this.advance();
    }

    // EOF reached without a closer.
    flush();
    if (this.tolerant) {
      this.push("RBRACE", "}", this.loc());
      this.stack.pop();
      return;
    }
    throw new HTSLError("formule mathématique jamais fermée.", startLoc, this.src);
  }

  /* ----------------------------------------------------------------------- */
  /* Primitives                                                              */
  /* ----------------------------------------------------------------------- */

  private top(): Frame {
    return this.stack[this.stack.length - 1]!;
  }

  /** Pop a content frame on `}`, but never empty the stack (top-level orphan). */
  private popContent(): void {
    if (this.stack.length > 1) this.stack.pop();
  }

  private readPath(): string {
    let path = "";
    while (!this.eof() && PATH_CHAR.test(this.peek())) path += this.advance();
    return path;
  }

  private readVarName(): string {
    let name = "";
    while (!this.eof() && IDENT_CHAR.test(this.peek())) name += this.advance();
    return name;
  }

  private readKeyword(): string {
    let kw = "";
    while (!this.eof() && /[A-Za-z]/.test(this.peek())) kw += this.advance();
    return kw;
  }

  private skipSpaces(): void {
    while (this.peek() === " " || this.peek() === "\t") this.advance();
  }

  private eof(): boolean {
    return this.pos >= this.src.length;
  }

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
