/**
 * HTSL — HyperText Structured Language.
 *
 * Public API:
 *
 *   import { parse, render, compile } from "htsl";
 *
 *   const ast  = parse("{p:Bonjour}", { mode: "strict" });
 *   const html = render(ast, { prettyPrint: true });
 *   const out  = compile("{p:Bonjour}"); // parse + render in one call
 */
import { parse } from "./parser.js";
import { render } from "./renderer.js";
import type { CompileOptions, Node } from "./types.js";

export { parse } from "./parser.js";
export { render } from "./renderer.js";
export { tokenize } from "./lexer.js";
export { HTSLError } from "./errors.js";

export type {
  Node,
  ElementNode,
  TextNode,
  CommentNode,
  ErrorNode,
  Token,
  TokenType,
  Loc,
  ParseMode,
  ParseOptions,
  RenderOptions,
  CompileOptions,
} from "./types.js";

/** Parse then render a HTSL source string in a single call. */
export function compile(source: string, options: CompileOptions = {}): string {
  const ast: Node[] = parse(source, options);
  return render(ast, options);
}
