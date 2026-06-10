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
import { tokenize } from "./lexer.js";
import { fromHtml, parseHtml, toHtsl } from "./from-html.js";
import { HTSLError } from "./errors.js";
import type { CompileOptions, Node } from "./types.js";

export { parse } from "./parser.js";
export { render } from "./renderer.js";
export { tokenize } from "./lexer.js";
export { fromHtml, parseHtml, toHtsl } from "./from-html.js";
export type { ToHtslOptions } from "./from-html.js";
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

/**
 * The HTSL engine as a single namespace object.
 *
 * Lets you call `htsl_engine.compile(...)`, `htsl_engine.parse(...)`, etc.
 * Exposed in the browser bundle as the globals `htsl_engine` and `HTML_ENGINE`,
 * and available in ESM as both a named and the default export.
 */
export const htsl_engine = {
  parse,
  render,
  compile,
  tokenize,
  fromHtml,
  parseHtml,
  toHtsl,
  HTSLError,
} as const;

export default htsl_engine;
