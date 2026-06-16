/**
 * Hand-written CodeMirror 6 StreamLanguage for HTSL.
 *
 * Mirrors the engine's contextual lexer (content / header / math frames) to
 * colour: structural braces, tag names, .classes, #ids, [attribute] blocks
 * (names vs values vs strings), @objects/components, {!directives}, {$variables},
 * inline/block math, comments and escapes.
 */
import {
  foldService,
  HighlightStyle,
  type IndentContext,
  LanguageSupport,
  StreamLanguage,
  StringStream,
  syntaxHighlighting,
} from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import { Tag } from "@lezer/highlight";
import { contentModelOf } from "@noah-medra/htsl-core";

const IDENT = /[A-Za-z0-9_-]/;
const PATH = /^[A-Za-z0-9_.-]+/;

type Frame =
  | { mode: "content" }
  | { mode: "header"; path?: string; tag?: string; directive?: boolean; inBracket?: boolean; afterEq?: boolean }
  | { mode: "math"; closer: "brace" | "dollar" | "ddollar"; depth: number }
  | { mode: "raw"; lang: "js" | "css"; depth: number; block?: boolean; tmpl?: boolean };

/** Tags whose body is real JS/CSS, highlighted as such (not as HTSL). */
const RAW_TEXT_TAGS = new Set(["script", "style"]);

// prettier-ignore
const JS_KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "do", "switch", "case", "break", "continue", "new", "this", "typeof",
  "instanceof", "in", "of", "class", "extends", "super", "import", "export",
  "from", "as", "default", "try", "catch", "finally", "throw", "await",
  "async", "yield", "void", "delete", "null", "true", "false", "undefined",
]);

interface State {
  stack: Frame[];
  comment: boolean;
}

function top(s: State): Frame {
  return s.stack[s.stack.length - 1] ?? { mode: "content" };
}

function token(stream: StringStream, s: State): string | null {
  if (s.comment) {
    while (!stream.eol()) {
      if (stream.match("--}")) {
        s.comment = false;
        break;
      }
      stream.next();
    }
    return "comment";
  }
  const frame = top(s);
  if (frame.mode === "content") return contentToken(stream, s);
  if (frame.mode === "header") return headerToken(stream, s, frame);
  if (frame.mode === "raw") return rawToken(stream, s, frame);
  return mathToken(stream, s, frame);
}

function contentToken(stream: StringStream, s: State): string | null {
  if (stream.match("{!--")) {
    while (!stream.eol()) {
      if (stream.match("--}")) return "comment";
      stream.next();
    }
    s.comment = true;
    return "comment";
  }
  const ch = stream.peek();
  if (ch === "\\") {
    stream.next();
    const n = stream.peek();
    if (n === "{" || n === "}" || n === ":" || n === "$") {
      stream.next();
      return "escape";
    }
    return null;
  }
  if (ch === "{") {
    if (stream.match("{$")) {
      stream.eatWhile(IDENT);
      stream.eat("}");
      return "var";
    }
    if (stream.match("{!")) {
      stream.eatWhile(/[A-Za-z]/);
      s.stack.push({ mode: "header", directive: true });
      return "directive";
    }
    if (stream.match("{@")) {
      const m = stream.match(PATH);
      const path = Array.isArray(m) ? m[0] : undefined;
      s.stack.push({ mode: "header", ...(path ? { path } : {}) });
      return "object";
    }
    stream.next();
    s.stack.push({ mode: "header" });
    return "brace";
  }
  if (ch === "}") {
    stream.next();
    if (s.stack.length > 1) s.stack.pop();
    return "brace";
  }
  if (ch === "$") {
    if (stream.match("$$")) {
      s.stack.push({ mode: "math", closer: "ddollar", depth: 0 });
      return "math";
    }
    stream.next();
    s.stack.push({ mode: "math", closer: "dollar", depth: 0 });
    return "math";
  }
  stream.eatWhile((c) => c !== "{" && c !== "}" && c !== "$" && c !== "\\");
  return null;
}

function headerToken(
  stream: StringStream,
  s: State,
  frame: Extract<Frame, { mode: "header" }>,
): string | null {
  if (stream.eatSpace()) return null;
  const ch = stream.peek();
  switch (ch) {
    case "}":
      stream.next();
      if (s.stack.length > 1) s.stack.pop();
      return "brace";
    case ":": {
      stream.next();
      if (s.stack.length > 1) s.stack.pop();
      let math = false;
      if (!frame.directive) {
        if (frame.path && contentModelOf(frame.path) === "math") math = true;
        else if (!frame.path && (frame.tag === "line" || frame.tag === "case")) math = true;
      }
      const raw = !frame.directive && !frame.path && frame.tag && RAW_TEXT_TAGS.has(frame.tag);
      if (raw) {
        s.stack.push({ mode: "raw", lang: frame.tag === "style" ? "css" : "js", depth: 0 });
      } else {
        s.stack.push(math ? { mode: "math", closer: "brace", depth: 0 } : { mode: "content" });
      }
      return "brace";
    }
    case "/":
      stream.next();
      return "brace";
    case "#":
      if (frame.inBracket) {
        stream.next();
        return frame.afterEq ? "value" : "attr";
      }
      stream.next();
      stream.eatWhile(IDENT);
      return "id";
    case ".":
      if (frame.inBracket) {
        stream.next();
        return frame.afterEq ? "value" : "attr";
      }
      stream.next();
      stream.eatWhile(IDENT);
      return "class";
    case "[":
      stream.next();
      frame.inBracket = true;
      return "brace";
    case "]":
      stream.next();
      frame.inBracket = false;
      frame.afterEq = false;
      return "brace";
    case "=":
      stream.next();
      frame.afterEq = true;
      return "brace";
    case ",":
      stream.next();
      frame.afterEq = false;
      return "brace";
    case '"': {
      stream.next();
      while (!stream.eol()) {
        const c = stream.next();
        if (c === "\\") {
          stream.next();
          continue;
        }
        if (c === '"') break;
      }
      frame.afterEq = false;
      return "string";
    }
    default: {
      // Inside [attrs], values may contain dots (e.g. 0.5); tag/class/id outside
      // brackets must stop at the structural "." so classes stay separate.
      const re = frame.inBracket ? /^[A-Za-z0-9_.-]+/ : /^[A-Za-z0-9_-]+/;
      const m = stream.match(re);
      if (!Array.isArray(m)) {
        stream.next();
        return null;
      }
      if (frame.afterEq) {
        frame.afterEq = false;
        return "value";
      }
      if (frame.inBracket) return "attr";
      if (frame.tag === undefined && !frame.directive) frame.tag = m[0];
      return "tag";
    }
  }
}

function mathToken(
  stream: StringStream,
  s: State,
  frame: Extract<Frame, { mode: "math" }>,
): string | null {
  const ch = stream.peek();
  if (ch === "\\") {
    stream.next();
    if (!stream.eol()) stream.next();
    return "math";
  }
  if (ch === "{") {
    if (stream.match("{@")) {
      const m = stream.match(PATH);
      const path = Array.isArray(m) ? m[0] : undefined;
      s.stack.push({ mode: "header", ...(path ? { path } : {}) });
      return "object";
    }
    if (stream.match("{$")) {
      stream.eatWhile(IDENT);
      stream.eat("}");
      return "var";
    }
    stream.next();
    frame.depth++;
    return "math";
  }
  if (ch === "}") {
    stream.next();
    if (frame.depth > 0) frame.depth--;
    else if (s.stack.length > 1) s.stack.pop();
    return "math";
  }
  if (ch === "$") {
    if (frame.closer === "ddollar" && stream.match("$$")) {
      if (s.stack.length > 1) s.stack.pop();
      return "math";
    }
    if (frame.closer === "dollar") {
      stream.next();
      if (s.stack.length > 1) s.stack.pop();
      return "math";
    }
    stream.next();
    return "math";
  }
  stream.eatWhile((c) => c !== "\\" && c !== "{" && c !== "}" && c !== "$");
  return "math";
}

/**
 * Raw-text body of `{script:…}` / `{style:…}` — highlighted as JS/CSS. Tracks
 * brace depth (ignoring braces in strings/comments) so the `}` at depth 0 closes
 * the element. Strings, template literals and block comments persist across lines
 * via the frame state.
 */
function rawToken(stream: StringStream, s: State, frame: Extract<Frame, { mode: "raw" }>): string | null {
  // Resume a multi-line block comment.
  if (frame.block) {
    while (!stream.eol()) {
      if (stream.match("*/")) {
        frame.block = false;
        return "comment";
      }
      stream.next();
    }
    return "comment";
  }
  // Resume a multi-line template literal.
  if (frame.tmpl) {
    if (scanString(stream, "`")) frame.tmpl = false;
    return "string";
  }
  if (stream.eatSpace()) return null;
  const ch = stream.peek() ?? "";

  // Comments.
  if (frame.lang === "js" && stream.match("//")) {
    stream.skipToEnd();
    return "comment";
  }
  if (stream.match("/*")) {
    while (!stream.eol()) {
      if (stream.match("*/")) return "comment";
      stream.next();
    }
    frame.block = true;
    return "comment";
  }

  // Strings.
  if (ch === '"' || ch === "'") {
    stream.next(); // opening quote
    scanString(stream, ch);
    return "string";
  }
  if (frame.lang === "js" && ch === "`") {
    stream.next(); // opening backtick
    if (!scanString(stream, "`")) frame.tmpl = true;
    return "string";
  }

  // Braces drive depth; the one at depth 0 closes the element.
  if (ch === "{") {
    stream.next();
    frame.depth++;
    return "brace";
  }
  if (ch === "}") {
    stream.next();
    if (frame.depth > 0) frame.depth--;
    else if (s.stack.length > 1) s.stack.pop();
    return "brace";
  }

  // Numbers.
  if (/[0-9]/.test(ch)) {
    stream.match(/^[0-9][0-9._]*(e[+-]?[0-9]+)?/i);
    return frame.lang === "js" ? "number" : null;
  }

  // Identifiers / keywords.
  if (/[A-Za-z_$]/.test(ch)) {
    const m = stream.match(/^[A-Za-z0-9_$]+/);
    const word = Array.isArray(m) ? m[0] : "";
    if (frame.lang === "js" && JS_KEYWORDS.has(word)) return "keyword";
    return null;
  }

  stream.next();
  return null;
}

/** Scan a string body (the opening quote is already consumed). Returns true if
 *  the closing quote was found on this line (handles `\` escapes). */
function scanString(stream: StringStream, quote: string): boolean {
  while (!stream.eol()) {
    const c = stream.next();
    if (c === "\\") {
      stream.next();
      continue;
    }
    if (c === quote) return true;
  }
  return false;
}

/* -------------------------------------------------------------------------- */
/* Tags → CSS classes                                                         */
/* -------------------------------------------------------------------------- */

const T = {
  brace: Tag.define(),
  tag: Tag.define(),
  cls: Tag.define(),
  id: Tag.define(),
  attr: Tag.define(),
  value: Tag.define(),
  string: Tag.define(),
  object: Tag.define(),
  directive: Tag.define(),
  variable: Tag.define(),
  math: Tag.define(),
  comment: Tag.define(),
  escape: Tag.define(),
  keyword: Tag.define(), // JS keywords inside {script:…}
  number: Tag.define(), // JS numbers inside {script:…}
};

/**
 * Indentation from the brace nesting depth: every open `{…}` / `{@…}` / math
 * block is one frame above the root, so the indent is `(openBlocks) * unit`.
 * A line starting with `}` dedents one level so closers line up with their open.
 */
function indent(state: State, textAfter: string, context: IndentContext): number {
  const open = Math.max(0, state.stack.length - 1);
  const closing = /^\s*\}/.test(textAfter) ? 1 : 0;
  return Math.max(0, open - closing) * context.unit;
}

const streamParser = {
  name: "htsl",
  startState: (): State => ({ stack: [{ mode: "content" }], comment: false }),
  copyState: (s: State): State => ({ stack: s.stack.map((f) => ({ ...f })), comment: s.comment }),
  token,
  indent,
  languageData: { indentOnInput: /^\s*\}$/ },
  tokenTable: {
    brace: T.brace,
    tag: T.tag,
    class: T.cls,
    id: T.id,
    attr: T.attr,
    value: T.value,
    string: T.string,
    object: T.object,
    directive: T.directive,
    var: T.variable,
    math: T.math,
    comment: T.comment,
    escape: T.escape,
    keyword: T.keyword,
    number: T.number,
  },
};

const language = StreamLanguage.define<State>(streamParser);

// Self-contained default theme (inline styles), so the extension colours HTSL
// out of the box without requiring the host to ship CSS.
const highlight = HighlightStyle.define([
  { tag: T.brace, color: "#868e96" },
  { tag: T.tag, color: "#1c7ed6", fontWeight: "600" },
  { tag: T.cls, color: "#2f9e44" },
  { tag: T.id, color: "#e8590c" },
  { tag: T.attr, color: "#5f3dc4" },
  { tag: T.value, color: "#0c8599" },
  { tag: T.string, color: "#c2255c" },
  { tag: T.object, color: "#1971c2", fontWeight: "600" },
  { tag: T.directive, color: "#ae3ec9", fontWeight: "600" },
  { tag: T.variable, color: "#d6336c" },
  { tag: T.math, color: "#0b7285", backgroundColor: "#e7f5f8" },
  { tag: T.comment, color: "#adb5bd", fontStyle: "italic" },
  { tag: T.escape, color: "#f08c00" },
  { tag: T.keyword, color: "#1971c2", fontWeight: "600" },
  { tag: T.number, color: "#e8590c" },
]);

/* -------------------------------------------------------------------------- */
/* Code folding (collapse multi-line {…} / {@…} blocks)                        */
/* -------------------------------------------------------------------------- */

/**
 * Fold range for a line: if the line opens a `{…}` block whose matching `}` is on
 * a later line, fold from the end of the opening line to just before that `}`.
 * Braces inside escapes (`\{`, `\}`) and `"…"` strings are ignored; balanced
 * braces in math/scripts simply cancel out.
 */
function htslFold(state: EditorState, lineStart: number, lineEnd: number): { from: number; to: number } | null {
  const s = state.doc.sliceString(lineStart, state.doc.length);
  const lineLen = lineEnd - lineStart;
  let depth = 0;
  let quote = ""; // inside a "…" string

  const step = (i: number): number => {
    const c = s[i]!;
    if (c === "\\") return i + 2; // escape: skip the next char
    if (quote) {
      if (c === quote) quote = "";
      return i + 1;
    }
    if (c === '"') quote = c;
    else if (c === "{") depth++;
    else if (c === "}") depth--;
    return i + 1;
  };

  // Scan the opening line.
  let i = 0;
  while (i < lineLen) i = step(i);
  if (depth <= 0) return null; // this line does not open a multi-line block

  // Continue scanning until the matching close brings depth back to 0.
  while (i < s.length) {
    const c = s[i]!;
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (quote) {
      if (c === quote) quote = "";
      i++;
      continue;
    }
    if (c === '"') quote = c;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      const to = lineStart + i; // position of the closing brace
      if (to <= lineEnd) return null; // closes on the same line
      return { from: lineEnd, to };
    }
    i++;
  }
  return null;
}

export function htslLanguage(): LanguageSupport {
  return new LanguageSupport(language, [
    syntaxHighlighting(highlight),
    foldService.of(htslFold),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Test/inspection helper                                                     */
/* -------------------------------------------------------------------------- */

export interface HtslToken {
  text: string;
  type: string;
}

/**
 * Run the HTSL stream tokenizer over a source string and return the non-blank
 * tokens with their type. Mainly for tests and tooling.
 */
export function htslTokens(src: string): HtslToken[] {
  const out: HtslToken[] = [];
  const state = streamParser.startState();
  for (const line of src.split("\n")) {
    const stream = new StringStream(line, 2, 2);
    while (!stream.eol()) {
      stream.start = stream.pos;
      const type = streamParser.token(stream, state);
      if (stream.pos === stream.start) stream.pos++; // guard against stalls
      const text = line.slice(stream.start, stream.pos);
      if (type) out.push({ text, type });
    }
  }
  return out;
}
