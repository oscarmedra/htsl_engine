/**
 * Hand-written CodeMirror 6 StreamLanguage for HTSL.
 *
 * Mirrors the engine's contextual lexer (content / header / math frames) to
 * colour: structural braces, tag names, .classes, #ids, [attribute] blocks
 * (names vs values vs strings), @objects/components, {!directives}, {$variables},
 * inline/block math, comments and escapes.
 */
import {
  HighlightStyle,
  LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import type { StringStream } from "@codemirror/language";
import { Tag } from "@lezer/highlight";
import { contentModelOf } from "htsl";

const IDENT = /[A-Za-z0-9_-]/;
const PATH = /^[A-Za-z0-9_.-]+/;

type Frame =
  | { mode: "content" }
  | { mode: "header"; path?: string; tag?: string; directive?: boolean; inBracket?: boolean; afterEq?: boolean }
  | { mode: "math"; closer: "brace" | "dollar" | "ddollar"; depth: number };

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
      s.stack.push(math ? { mode: "math", closer: "brace", depth: 0 } : { mode: "content" });
      return "brace";
    }
    case "/":
      stream.next();
      return "brace";
    case "#":
      stream.next();
      stream.eatWhile(IDENT);
      return "id";
    case ".":
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
      const m = stream.match(/^[A-Za-z0-9_.-]+/);
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
};

const language = StreamLanguage.define<State>({
  name: "htsl",
  startState: () => ({ stack: [{ mode: "content" }], comment: false }),
  copyState: (s) => ({ stack: s.stack.map((f) => ({ ...f })), comment: s.comment }),
  token,
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
  },
});

const highlight = HighlightStyle.define([
  { tag: T.brace, class: "tok-brace" },
  { tag: T.tag, class: "tok-tag" },
  { tag: T.cls, class: "tok-class" },
  { tag: T.id, class: "tok-id" },
  { tag: T.attr, class: "tok-attr" },
  { tag: T.value, class: "tok-value" },
  { tag: T.string, class: "tok-string" },
  { tag: T.object, class: "tok-object" },
  { tag: T.directive, class: "tok-directive" },
  { tag: T.variable, class: "tok-var" },
  { tag: T.math, class: "tok-math" },
  { tag: T.comment, class: "tok-comment" },
  { tag: T.escape, class: "tok-escape" },
]);

export function htslLanguage(): LanguageSupport {
  return new LanguageSupport(language, [syntaxHighlighting(highlight)]);
}
