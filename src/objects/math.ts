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
    case "math.constant.pi":
      return "\\pi";
    case "math.text.ref":
      return ""; // resolved at the HTML level
    default:
      return latexOfChildren(obj.children);
  }
}

function lines(obj: ObjectNode, tag: string): string[] {
  return obj.children
    .filter((c): c is ElementNode => c.type === "element" && c.tag === tag)
    .map((c) => latexOfChildren(c.children).trim());
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
}

export function renderMathObject(
  node: ObjectNode,
  ctx: MathContext,
  options: MathRenderOptions,
): string {
  const katex = options.katex;
  switch (node.path) {
    case "math.text.inline":
      return inline(latexOfObject(node), katex);
    case "math.text.block":
    case "math.text.align":
    case "math.text.cases":
    case "math.text.system":
      return block(latexOfObject(node), katex);
    case "math.text.equation":
      return equation(node, ctx, katex);
    case "math.text.ref":
      return reference(node, ctx, options.source);
    default:
      return inline(latexOfObject(node), katex);
  }
}

function equation(
  node: ObjectNode,
  ctx: MathContext,
  katex: KatexLike | undefined,
): string {
  const n = ctx.numbers.get(node) ?? 0;
  const label = node.attrs["label"];
  const id = label ? ` id="htsl-eq-${escapeHtml(label)}"` : "";
  const body = displayMath(latexOfObject(node), katex);
  return (
    `<div class="htsl-math-equation"${id}>` +
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

function inline(tex: string, katex: KatexLike | undefined): string {
  return `<span class="htsl-math-inline">${inlineMath(tex, katex)}</span>`;
}

function block(tex: string, katex: KatexLike | undefined): string {
  return `<div class="htsl-math-block">${displayMath(tex, katex)}</div>`;
}

function inlineMath(tex: string, katex: KatexLike | undefined): string {
  if (katex) return katex.renderToString(tex, { displayMode: false, throwOnError: false });
  return `<span class="htsl-math-raw">${escapeHtml(tex)}</span>`;
}

function displayMath(tex: string, katex: KatexLike | undefined): string {
  if (katex) return katex.renderToString(tex, { displayMode: true, throwOnError: false });
  return `<span class="htsl-math-raw">${escapeHtml(tex)}</span>`;
}
