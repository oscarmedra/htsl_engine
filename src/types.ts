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
  | "COMMENT" // {!-- ... --}
  | "EOF"; // end of input

export interface Token {
  type: TokenType;
  /** The literal slice of source the token represents (already unescaped for TEXT/STRING). */
  value: string;
  loc: Loc;
}

/* -------------------------------------------------------------------------- */
/* AST nodes                                                                   */
/* -------------------------------------------------------------------------- */

export interface TextNode {
  type: "text";
  value: string;
  loc: Loc;
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
}

/** Inserted by the parser in `tolerant` mode when it recovers from an error. */
export interface ErrorNode {
  type: "error";
  message: string;
  loc: Loc;
}

/** Discriminated union of every AST node, keyed on `type`. */
export type Node = ElementNode | TextNode | CommentNode | ErrorNode;

/* -------------------------------------------------------------------------- */
/* Options                                                                     */
/* -------------------------------------------------------------------------- */

export type ParseMode = "strict" | "tolerant";

export interface ParseOptions {
  /** `strict` throws on the first error; `tolerant` records an ErrorNode and continues. Default: `strict`. */
  mode?: ParseMode;
  /** Maximum nesting depth before bailing out. Default: 256. */
  maxDepth?: number;
}

export interface RenderOptions {
  /** Indent output with 2 spaces per level. Default: false (compact). */
  prettyPrint?: boolean;
  /** If provided, any tag not in this list is rendered as escaped text. */
  allowedTags?: string[];
}

export type CompileOptions = ParseOptions & RenderOptions;
