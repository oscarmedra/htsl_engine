/**
 * Interactive parameter — `{@param[name="a", min=-3, max=3, step=0.1, value=1]/}`.
 *
 * Renders a slider. A `{@plot}` whose `fn` uses the parameter is re-sampled live
 * by the runtime when the slider moves (the "Desmos moment"). Still no JS from
 * the content: the slider is a declarative `<input type="range">` and the engine
 * runtime wires it (re-evaluating the function with the safe expression
 * interpreter — never `eval`).
 */
import { escapeHtml } from "../escape.js";
import type { Node, ObjectNode } from "../types.js";

export function isParamPath(path: string): boolean {
  return path === "param";
}

export interface ParamDef {
  min: number;
  max: number;
  step: number;
  value: number;
}
export type ParamContext = Map<string, ParamDef>;

function num(v: string | undefined, fallback: number): number {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Pre-pass: collect declared parameters and their default values. */
export function buildParamContext(nodes: Node[]): ParamContext {
  const ctx: ParamContext = new Map();
  const walk = (node: Node): void => {
    if (node.type === "object") {
      if (node.path === "param") {
        const name = node.attrs["name"];
        if (name) {
          ctx.set(name, {
            min: num(node.attrs["min"], 0),
            max: num(node.attrs["max"], 10),
            step: num(node.attrs["step"], 0.1),
            value: num(node.attrs["value"], num(node.attrs["min"], 0)),
          });
        }
      }
      node.children.forEach(walk);
    } else if (node.type === "element") {
      node.children.forEach(walk);
    }
  };
  nodes.forEach(walk);
  return ctx;
}

/** Default values as a plain scope, for compile-time sampling of plots. */
export function paramValues(ctx: ParamContext): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const [name, def] of ctx) scope[name] = def.value;
  return scope;
}

export function renderParam(node: ObjectNode): string {
  const name = node.attrs["name"] ?? "a";
  const def: ParamDef = {
    min: num(node.attrs["min"], 0),
    max: num(node.attrs["max"], 10),
    step: num(node.attrs["step"], 0.1),
    value: num(node.attrs["value"], num(node.attrs["min"], 0)),
  };
  const label = node.attrs["label"] ?? name;
  return (
    `<div class="htsl-param" data-htsl-param>` +
    `<label class="htsl-param-label">${escapeHtml(label)} = ` +
    `<span class="htsl-param-value" data-htsl-param-value="${escapeHtml(name)}">${def.value}</span></label>` +
    `<input type="range" class="htsl-param-range" data-htsl-param-name="${escapeHtml(name)}" ` +
    `min="${def.min}" max="${def.max}" step="${def.step}" value="${def.value}" />` +
    `</div>`
  );
}
