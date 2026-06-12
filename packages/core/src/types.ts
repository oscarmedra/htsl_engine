/**
 * Type definitions for the HTSL engine: source locations, tokens and AST nodes.
 */

/** A position in the source text. `line` and `col` are 1-based. */
export interface Loc {
  line: number;
  col: number;
}

/* -------------------------------------------------------------------------- */
/* Tokens                                                                      */
/* -------------------------------------------------------------------------- */

export type TokenType =
  | "LBRACE" // {
  | "RBRACE" // }
  | "HASH" // #
  | "DOT" // .
  | "COLON" // :
  | "SLASH" // /
  | "LBRACKET" // [
  | "RBRACKET" // ]
  | "EQUALS" // =
  | "COMMA" // ,
  | "IDENT" // identifier (tag, class, id, attr name)
  | "STRING" // "quoted value"
  | "TEXT" // raw text content
  | "MATH_TEXT" // raw LaTeX run inside a math object's content
  | "OBJOPEN" // object opener: {@path  (value = dotted path / alias)
  | "DEFINE_OPEN" // component definition opener: {!define name (value = name)
  | "SET_OPEN" // variable assignment opener: {!set name (value = name)
  | "VARREF" // variable / parameter reference: {$name} (value = name)
  | "COMMENT" // {!-- ... --}
  | "EOF"; // end of input

export interface Token {
  type: TokenType;
  /** The literal slice of source the token represents (already unescaped for TEXT/STRING). */
  value: string;
  loc: Loc;
  /** Absolute source start offset (TEXT tokens). */
  start?: number;
  /** Absolute source end offset (TEXT tokens). */
  end?: number;
}

/* -------------------------------------------------------------------------- */
/* AST nodes                                                                   */
/* -------------------------------------------------------------------------- */

export interface TextNode {
  type: "text";
  value: string;
  loc: Loc;
  /**
   * Absolute source `[start, end]` offsets of the raw text run, present only
   * when parsed with `{ ranges: true }`. Enables editing the rendered text back
   * into the source.
   */
  range?: [number, number];
}

export interface CommentNode {
  type: "comment";
  value: string;
  loc: Loc;
}

export interface ElementNode {
  type: "element";
  tag: string;
  id: string | null;
  classes: string[];
  attrs: Record<string, string>;
  selfClosing: boolean;
  children: Node[];
  loc: Loc;
  /**
   * Absolute source `[start, end]` offsets of the whole `{...}` element, present
   * only when parsed with `{ ranges: true }`. Enables editing the element's
   * source directly from the rendered preview.
   */
  range?: [number, number];
}

/**
 * A registered object: `{@path[attrs]:content}` or `{@path[attrs]/}`.
 *
 * `path` is the canonical dotted path (aliases resolved); `rawPath` is what the
 * author wrote. Math objects carry their LaTeX body as text/object children.
 */
export interface ObjectNode {
  type: "object";
  path: string;
  rawPath: string;
  attrs: Record<string, string>;
  selfClosing: boolean;
  children: Node[];
  loc: Loc;
  /** Absolute source `[start, end]` offsets of the whole `{@...}` object, present
   *  only when parsed with `{ ranges: true }` (see {@link ElementNode.range}). */
  range?: [number, number];
}

/** A component parameter, with an optional default value. */
export interface Param {
  name: string;
  default: string | null;
}

/** A component definition: `{!define name[params]: body}`. Removed by expansion. */
export interface DefineNode {
  type: "define";
  name: string;
  params: Param[];
  body: Node[];
  loc: Loc;
}

/** A variable assignment: `{!set name: value}`. Removed by expansion. */
export interface SetNode {
  type: "set";
  name: string;
  value: Node[];
  loc: Loc;
}

/** A variable / parameter reference: `{$name}` (or `{$children}`). */
export interface VarRefNode {
  type: "var";
  name: string;
  loc: Loc;
}

/** Inserted by the parser in `tolerant` mode when it recovers from an error. */
export interface ErrorNode {
  type: "error";
  message: string;
  loc: Loc;
}

/** Discriminated union of every AST node, keyed on `type`. */
export type Node =
  | ElementNode
  | TextNode
  | CommentNode
  | ObjectNode
  | DefineNode
  | SetNode
  | VarRefNode
  | ErrorNode;

/* -------------------------------------------------------------------------- */
/* Options                                                                     */
/* -------------------------------------------------------------------------- */

export type ParseMode = "strict" | "tolerant";

export interface ParseOptions {
  /** `strict` throws on the first error; `tolerant` records an ErrorNode and continues. Default: `strict`. */
  mode?: ParseMode;
  /** Maximum nesting depth before bailing out. Default: 256. */
  maxDepth?: number;
  /** Attach `range: [start, end]` source offsets to text nodes. Default: false. */
  ranges?: boolean;
}

/** Minimal shape of the optional KaTeX dependency used to render formulas. */
export interface KatexLike {
  renderToString(
    tex: string,
    options?: { displayMode?: boolean; throwOnError?: boolean },
  ): string;
}

export interface RenderOptions {
  /** Indent output with 2 spaces per level. Default: false (compact). */
  prettyPrint?: boolean;
  /** If provided, any tag not in this list is rendered as escaped text. */
  allowedTags?: string[];
  /** Optional KaTeX module. When absent, formulas fall back to raw LaTeX. */
  katex?: KatexLike;
  /** Original source, used to build localized excerpts for render-time errors. */
  source?: string;
  /**
   * Stamp `data-htsl-hash` (a stable subtree hash) on top-level nodes, math
   * blocks and scenes. Off by default; hosts that morph the DOM enable it so an
   * unchanged block can be skipped entirely. Does not affect the language.
   */
  hashBlocks?: boolean;
  /**
   * Wrap source-backed text runs in
   * `<span class="htsl-edit" data-htsl-text="start-end">…</span>` so a host can
   * make them editable and write changes back to the source. Requires the AST
   * to be parsed with `{ ranges: true }`. Off by default.
   */
  editableText?: boolean;
}

export type CompileOptions = ParseOptions & RenderOptions;
