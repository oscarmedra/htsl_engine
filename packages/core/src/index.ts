/**
 * HTSL — HyperText Structured Language.
 *
 * Public API:
 *
 *   import { parse, render, compile } from "@noah-medra/htsl-core";
 *
 *   const ast  = parse("{p:Bonjour}", { mode: "strict" });
 *   const html = render(ast, { prettyPrint: true });
 *   const out  = compile("{p:Bonjour}"); // parse + render in one call
 */
import { parse } from "./parser.js";
import { render } from "./renderer.js";
import { tokenize } from "./lexer.js";
import { fromHtml, parseHtml, toHtsl } from "./from-html.js";
import { expand } from "./components/expand.js";
import { hydrateScenes } from "./scene-client.js";
import { hydrate, purge, loadDependency, installHtslRuntime } from "./runtime.js";
import { registry } from "./introspect.js";
import { mathCss } from "./objects/css.js";
import { HTSLError } from "./errors.js";
import type { CompileOptions, Node } from "./types.js";

export { parse } from "./parser.js";
export { render } from "./renderer.js";
export { tokenize } from "./lexer.js";
export { fromHtml, parseHtml, toHtsl } from "./from-html.js";
export type { ToHtslOptions } from "./from-html.js";
export { expand } from "./components/expand.js";
export type { ExpandOptions } from "./components/expand.js";
export { latexOfObject, latexOfNode, clearKatexCache } from "./objects/math.js";
export { htslHash } from "./hash.js";
export { toPlotly, sceneSpec, latexOfGeometry, isGeometryPath, isScenePath, isDecorPath, parseComplex } from "./objects/geometry.js";
export type { Trace, SceneSpec } from "./objects/geometry.js";
export { hydrateScenes, pendingScenes, purgeScenes } from "./scene-client.js";
export type { PlotlyLike } from "./scene-client.js";
export { hydrateThree, pendingThree, purgeThree } from "./three-client.js";
export { hydrateSlides, pendingSlides, purgeSlides } from "./slides-client.js";
export { isSlidePath, SLIDER_DECK_PATH, SLIDER_SLIDE_PATH } from "./objects/slides.js";
export { threeSpec, isThreePath, renderThree } from "./objects/three.js";
export type { ThreeSpec, ThreeObject } from "./objects/three.js";
export { renderPlot, isPlotPath } from "./objects/plot.js";
export { compileExpr, safeExpr } from "./objects/expr.js";
export type { CompiledExpr } from "./objects/expr.js";
export { loadDependency, hydrate, purge, installHtslRuntime } from "./runtime.js";
export type { HtslRuntime } from "./runtime.js";
export { resolvePath, isKnownObject, contentModelOf } from "./objects/registry.js";
export { registry, documentComponents, documentVariables } from "./introspect.js";
export type { ComponentInfo } from "./introspect.js";
export type { ObjectMeta, AttrSchema, AttrType, RegistryEntry, ContentModel, Category, EntryKind } from "./objects/registry.js";
export { mathCss } from "./objects/css.js";
export { HTSLError } from "./errors.js";

export type {
  Node,
  ElementNode,
  TextNode,
  CommentNode,
  ObjectNode,
  DefineNode,
  SetNode,
  VarRefNode,
  Param,
  ErrorNode,
  Token,
  TokenType,
  Loc,
  ParseMode,
  ParseOptions,
  RenderOptions,
  CompileOptions,
  KatexLike,
} from "./types.js";

/** Parse then render a HTSL source string in a single call. */
export function compile(source: string, options: CompileOptions = {}): string {
  const ast: Node[] = parse(source, options);
  // Pass the source through so render-time errors (e.g. unknown math refs)
  // can build a localized excerpt.
  return render(ast, { ...options, source });
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
  expand,
  hydrateScenes,
  hydrate,
  purge,
  loadDependency,
  installHtslRuntime,
  registry,
  mathCss,
  HTSLError,
} as const;

export default htsl_engine;
