/**
 * Math layer: turns math objects into LaTeX, then into HTML.
 *
 * - LaTeX generation resolves nested objects (e.g. `{@mof:...}` → `\frac{}{}`).
 * - Rendering uses KaTeX when provided, otherwise falls back to the raw LaTeX
 *   wrapped in a styleable element.
 * - A per-document context numbers `equation` objects in source order and
 *   resolves `ref` cross-references (unknown label → localized error).
 */
import { HTSLError } from "../errors.js";
import { escapeHtml } from "../escape.js";
import { isGeometryPath, latexOfGeometry, sceneSpec } from "./geometry.js";
import type { ElementNode, KatexLike, Node, ObjectNode } from "../types.js";

/* -------------------------------------------------------------------------- */
/* LaTeX generation                                                           */
/* -------------------------------------------------------------------------- */

export function latexOfNode(node: Node): string {
  switch (node.type) {
    case "text":
      return node.value;
    case "object":
      return latexOfObject(node);
    case "element":
      return latexOfChildren(node.children);
    case "comment":
    case "error":
    case "define":
    case "set":
    case "var":
      return "";
  }
}

function latexOfChildren(nodes: Node[]): string {
  return nodes.map(latexOfNode).join("");
}

export function latexOfObject(obj: ObjectNode): string {
  switch (obj.path) {
    case "math.text.inline":
    case "math.text.block":
    case "math.text.equation":
      return latexOfChildren(obj.children).trim();
    case "math.text.align":
      return env("aligned", lines(obj, "line"));
    case "math.text.cases":
      return casesLatex(obj);
    case "math.text.system":
      return systemLatex(obj);
    case "math.object.fraction":
      return `\\frac{${childLatex(obj, "num")}}{${childLatex(obj, "den")}}`;
    case "math.object.vector":
      return env(matrixEnv(obj.attrs["delim"]), lines(obj, "c"));
    case "math.object.matrix":
      return env(matrixEnv(obj.attrs["delim"]), lines(obj, "row").map(matrixRow));
    case "math.object.tensor":
      return tensorLatex(obj);
    case "math.object.set":
      return `\\left\\{ ${latexOfChildren(obj.children).trim()} \\right\\}`;
    case "math.object.complex":
      return complexLatex(obj);
    case "math.object.interval":
      return intervalLatex(obj);
    case "math.constant.pi":
      return "\\pi";
    case "math.constant.e":
      return "e";
    case "math.constant.inf":
      return "\\infty";
    case "math.constant.phi":
      return "\\varphi";
    case "math.constant.i":
      return "i";
    case "math.text.ref":
      return ""; // resolved at the HTML level
    default:
      if (isGeometryPath(obj.path)) return latexOfGeometry(obj);
      return latexOfChildren(obj.children);
  }
}

function lines(obj: ObjectNode, tag: string): string[] {
  return linesOf(obj.children, tag);
}

/** Like `lines`, but over an arbitrary node list (e.g. a tensor slice's rows). */
function linesOf(children: Node[], tag: string): string[] {
  return children
    .filter((c): c is ElementNode => c.type === "element" && c.tag === tag)
    .map((c) => latexOfChildren(c.children).trim());
}

/** Map a `delim` attribute to a KaTeX matrix environment (delimiter style). */
function matrixEnv(delim: string | undefined): string {
  switch ((delim ?? "").trim().toLowerCase()) {
    case "bracket":
    case "crochet":
      return "bmatrix"; // [ ]
    case "brace":
    case "accolade":
      return "Bmatrix"; // { }
    case "bar":
    case "det":
    case "determinant":
    case "déterminant":
      return "vmatrix"; // | |
    case "norm":
    case "norme":
      return "Vmatrix"; // ‖ ‖
    case "none":
    case "plain":
    case "aucun":
      return "matrix"; // (no delimiters)
    default:
      return "pmatrix"; // ( )
  }
}

/** A comma-separated row (`1, 2, 3`) → aligned LaTeX cells (`1 & 2 & 3`). */
function matrixRow(row: string): string {
  return row
    .split(",")
    .map((cell) => cell.trim())
    .join(" & ");
}

/**
 * Unified array object `@mot`: renders a vector, a matrix, or a rank-3 tensor.
 *  - `{c: …}` children  → column vector.
 *  - `{row: a,b,c}` …   → matrix (single row = row vector; `orient=col` transposes it).
 *  - `{slice: {row…}…}` → tensor: 2D slices shown side by side, each labelled
 *    (`{slice[label="k=1"]:…}`, else 1, 2, …).
 * `delim` picks the delimiter style everywhere.
 */
function tensorLatex(obj: ObjectNode): string {
  const envName = matrixEnv(obj.attrs["delim"]);

  const slices = obj.children.filter(
    (c): c is ElementNode => c.type === "element" && c.tag === "slice",
  );
  if (slices.length > 0) {
    return slices
      .map((slice, i) => {
        const matrix = env(envName, linesOf(slice.children, "row").map(matrixRow));
        const label = slice.attrs["label"] ?? String(i + 1);
        return `\\underset{${label}}{${matrix}}`;
      })
      .join(" \\quad ");
  }

  const cols = lines(obj, "c");
  if (cols.length > 0) return env(envName, cols); // column vector

  const rows = lines(obj, "row");
  if (rows.length === 1 && (obj.attrs["orient"] ?? "").trim() === "col") {
    // A single row asked to be vertical → transpose into a column vector.
    return env(envName, rows[0]!.split(",").map((cell) => cell.trim()));
  }
  return env(envName, rows.map(matrixRow));
}

function childLatex(obj: ObjectNode, tag: string): string {
  const el = obj.children.find(
    (c): c is ElementNode => c.type === "element" && c.tag === tag,
  );
  return el ? latexOfChildren(el.children).trim() : "";
}

function env(name: string, rows: string[]): string {
  return `\\begin{${name}} ${rows.join(" \\\\ ")} \\end{${name}}`;
}

function casesLatex(obj: ObjectNode): string {
  const body = env("cases", lines(obj, "case"));
  const intro = obj.attrs["intro"];
  return intro ? `${intro} = ${body}` : body;
}

function systemLatex(obj: ObjectNode): string {
  const rows = lines(obj, "line").join(" \\\\ ");
  return `\\left\\{ \\begin{array}{l} ${rows} \\end{array} \\right.`;
}

/** Complex number a + bi from `re`/`im` attributes, with sign/unit handling. */
function complexLatex(obj: ObjectNode): string {
  const re = (obj.attrs["re"] ?? "0").trim();
  const im = (obj.attrs["im"] ?? "0").trim();
  if (im === "" || im === "0") return re || "0";
  const negative = im.startsWith("-");
  const magnitude = (negative ? im.slice(1) : im.replace(/^\+/, "")).trim();
  const imTerm = magnitude === "1" ? "i" : `${magnitude}i`;
  if (re === "" || re === "0") return negative ? `-${imTerm}` : imTerm;
  return `${re} ${negative ? "-" : "+"} ${imTerm}`;
}

/** Interval from `from`/`to`, with `open` = none | left | right | both. */
function intervalLatex(obj: ObjectNode): string {
  const from = (obj.attrs["from"] ?? "").trim();
  const to = (obj.attrs["to"] ?? "").trim();
  const open = (obj.attrs["open"] ?? "none").trim();
  const left = open === "left" || open === "both" ? "\\left]" : "\\left[";
  const right = open === "right" || open === "both" ? "\\right[" : "\\right]";
  return `${left} ${from}, ${to} ${right}`;
}

/* -------------------------------------------------------------------------- */
/* Document context (numbering + labels)                                      */
/* -------------------------------------------------------------------------- */

export interface MathContext {
  numbers: Map<ObjectNode, number>;
  labels: Map<string, number>;
}

export function buildMathContext(nodes: Node[]): MathContext {
  const ctx: MathContext = { numbers: new Map(), labels: new Map() };
  let counter = 0;

  const walk = (node: Node): void => {
    if (node.type === "object") {
      if (node.path === "math.text.equation") {
        counter += 1;
        ctx.numbers.set(node, counter);
        const label = node.attrs["label"];
        if (label !== undefined) ctx.labels.set(label, counter);
      }
      node.children.forEach(walk);
    } else if (node.type === "element") {
      node.children.forEach(walk);
    }
  };

  nodes.forEach(walk);
  return ctx;
}

/* -------------------------------------------------------------------------- */
/* HTML rendering                                                             */
/* -------------------------------------------------------------------------- */

export interface MathRenderOptions {
  katex?: KatexLike;
  source?: string;
  /** Stable subtree hash → stamped as data-htsl-hash on the math/scene wrapper. */
  hash?: string;
}

export function renderMathObject(
  node: ObjectNode,
  ctx: MathContext,
  options: MathRenderOptions,
): string {
  const katex = options.katex;
  const h = options.hash ? ` data-htsl-hash="${options.hash}"` : "";
  switch (node.path) {
    case "math.text.inline":
      return inline(latexOfObject(node), katex, h);
    case "math.text.block":
    case "math.text.align":
    case "math.text.cases":
    case "math.text.system":
      return block(latexOfObject(node), katex, h);
    case "math.text.equation":
      return equation(node, ctx, katex, h);
    case "math.text.ref":
      return reference(node, ctx, options.source);
    case "math.geometry.2d.scene":
    case "math.geometry.3d.scene":
      return renderScene(node, options.source, h);
    default:
      return inline(latexOfObject(node), katex, h);
  }
}

/**
 * Render a geometry scene as a `<div>` carrying the Plotly spec in a data
 * attribute, plus a fallback message. Call `hydrateScenes()` in the browser to
 * draw them with Plotly when it is available.
 */
function renderScene(node: ObjectNode, source: string | undefined, hashAttr: string): string {
  const spec = sceneSpec(node, source);
  const width = typeof spec.layout["width"] === "number" ? spec.layout["width"] : 600;
  const height = typeof spec.layout["height"] === "number" ? spec.layout["height"] : 400;
  const json = escapeHtml(JSON.stringify(spec));
  const dim = node.path.includes(".3d.") ? "3d" : "2d";
  return (
    `<div class="htsl-scene htsl-scene--${dim}" data-htsl-scene="${json}"${hashAttr} ` +
    `style="width:${width}px;height:${height}px">` +
    `<span class="htsl-scene-fallback">Scène géométrique — Plotly requis ` +
    `(htsl_engine.hydrateScenes()).</span></div>`
  );
}

function equation(
  node: ObjectNode,
  ctx: MathContext,
  katex: KatexLike | undefined,
  hashAttr: string,
): string {
  const n = ctx.numbers.get(node) ?? 0;
  const label = node.attrs["label"];
  const id = label ? ` id="htsl-eq-${escapeHtml(label)}"` : "";
  const body = displayMath(latexOfObject(node), katex);
  return (
    `<div class="htsl-math-equation"${id}${hashAttr}>` +
    `<span class="htsl-math-body">${body}</span>` +
    `<span class="htsl-eqn-number">(${n})</span>` +
    `</div>`
  );
}

function reference(
  node: ObjectNode,
  ctx: MathContext,
  source: string | undefined,
): string {
  const to = node.attrs["to"];
  const n = to !== undefined ? ctx.labels.get(to) : undefined;
  if (n === undefined) {
    throw new HTSLError(
      `référence vers une équation inconnue : "${to ?? ""}".`,
      node.loc,
      source,
    );
  }
  return `<a class="htsl-math-ref" href="#htsl-eq-${escapeHtml(to ?? "")}">(${n})</a>`;
}

function inline(tex: string, katex: KatexLike | undefined, hashAttr: string): string {
  return `<span class="htsl-math-inline"${hashAttr}>${inlineMath(tex, katex)}</span>`;
}

function block(tex: string, katex: KatexLike | undefined, hashAttr: string): string {
  return `<div class="htsl-math-block"${hashAttr}>${displayMath(tex, katex)}</div>`;
}

/** Render a short LaTeX string inline (KaTeX if available, else raw). Reused by
 *  the variation/sign tables for their cell values. */
export function inlineMath(tex: string, katex: KatexLike | undefined): string {
  if (katex) return katexCached(tex, false, katex);
  return `<span class="htsl-math-raw">${escapeHtml(tex)}</span>`;
}

function displayMath(tex: string, katex: KatexLike | undefined): string {
  if (katex) return katexCached(tex, true, katex);
  return `<span class="htsl-math-raw">${escapeHtml(tex)}</span>`;
}

/* -------------------------------------------------------------------------- */
/* KaTeX memoization                                                          */
/* -------------------------------------------------------------------------- */

const KATEX_CACHE = new Map<string, string>();
const KATEX_CACHE_MAX = 500;

/** Memoize LaTeX → HTML so an already-rendered formula never re-calls KaTeX. */
function katexCached(tex: string, displayMode: boolean, katex: KatexLike): string {
  const key = (displayMode ? "D" : "I") + tex;
  const hit = KATEX_CACHE.get(key);
  if (hit !== undefined) return hit;
  const html = katex.renderToString(tex, { displayMode, throwOnError: false });
  if (KATEX_CACHE.size >= KATEX_CACHE_MAX) {
    const oldest = KATEX_CACHE.keys().next().value;
    if (oldest !== undefined) KATEX_CACHE.delete(oldest);
  }
  KATEX_CACHE.set(key, html);
  return html;
}

/** Clear the KaTeX memoization cache (mainly for tests). */
export function clearKatexCache(): void {
  KATEX_CACHE.clear();
}
