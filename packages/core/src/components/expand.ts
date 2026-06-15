/**
 * Component & variable expansion.
 *
 * Runs over the parsed AST *before* rendering and removes every component
 * (`{!define}` / `{@component}`), variable (`{!set}` / `{$name}`) and
 * `{$children}` placeholder, so the renderer only ever sees normal nodes.
 *
 * - `{!define}` are collected in a first pass (use-before-definition is valid).
 * - Component names share the `@` registry; colliding with a registered object
 *   is an error.
 * - Parameters support defaults; a missing required parameter is a localized
 *   error. Components may use other components; infinite recursion is detected
 *   and the nesting depth is capped at 64.
 * - Variables are document-scoped, may be redefined (last value at the point of
 *   use wins), and an unknown variable is a localized error. Variables also
 *   interpolate inside attribute values via `{$name}`.
 */
import { HTSLError } from "../errors.js";
import { isKnownObject, resolvePath } from "../objects/registry.js";
import type { DefineNode, Loc, Node } from "../types.js";

const MAX_COMPONENT_DEPTH = 64;
const VAR_PATTERN = /\{\$([A-Za-z0-9_-]+)\}/g;

export interface ExpandOptions {
  source?: string;
}

interface Ctx {
  components: Map<string, DefineNode>;
  vars: Map<string, string>;
  children: Node[] | null;
  stack: string[];
  source: string | undefined;
}

export function expand(nodes: Node[], options: ExpandOptions = {}): Node[] {
  const components = collectDefines(nodes, options.source);
  const ctx: Ctx = {
    components,
    vars: new Map(),
    children: null,
    stack: [],
    source: options.source,
  };
  return expandNodes(nodes, ctx);
}

/* -------------------------------------------------------------------------- */
/* First pass: collect component definitions                                  */
/* -------------------------------------------------------------------------- */

function collectDefines(nodes: Node[], source: string | undefined): Map<string, DefineNode> {
  const map = new Map<string, DefineNode>();

  const walk = (node: Node): void => {
    if (node.type === "define") {
      const key = resolvePath(node.name);
      if (isKnownObject(node.name)) {
        throw new HTSLError(
          `le composant "${node.name}" entre en collision avec un objet enregistré.`,
          node.loc,
          source,
        );
      }
      if (map.has(key)) {
        throw new HTSLError(`composant "${node.name}" déjà défini.`, node.loc, source);
      }
      map.set(key, node);
      node.body.forEach(walk);
      return;
    }
    childrenOf(node).forEach(walk);
  };

  nodes.forEach(walk);
  return map;
}

function childrenOf(node: Node): Node[] {
  switch (node.type) {
    case "element":
    case "object":
      return node.children;
    case "set":
      return node.value;
    case "define":
      return node.body;
    default:
      return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Expansion                                                                   */
/* -------------------------------------------------------------------------- */

function expandNodes(nodes: Node[], ctx: Ctx): Node[] {
  const out: Node[] = [];
  for (const node of nodes) {
    for (const result of expandNode(node, ctx)) out.push(result);
  }
  return out;
}

function expandNode(node: Node, ctx: Ctx): Node[] {
  switch (node.type) {
    case "define":
      return []; // stripped from output

    case "set": {
      const value = stringifyNodes(expandNodes(node.value, ctx));
      ctx.vars.set(node.name, value);
      return [];
    }

    case "var": {
      if (node.name === "children") {
        if (ctx.children === null) {
          throw new HTSLError(
            `"{$children}" n'est utilisable que dans un corps de composant.`,
            node.loc,
            ctx.source,
          );
        }
        return ctx.children;
      }
      const value = ctx.vars.get(node.name);
      if (value === undefined) {
        throw new HTSLError(`variable inconnue : "${node.name}".`, node.loc, ctx.source);
      }
      return [{ type: "text", value, loc: node.loc }];
    }

    case "object": {
      const component = ctx.components.get(node.path);
      if (component) return expandComponent(component, node, ctx);
      return [
        {
          ...node,
          attrs: interpolateAttrs(node.attrs, ctx, node.loc),
          children: expandNodes(node.children, ctx),
        },
      ];
    }

    case "element":
      return [
        {
          ...node,
          attrs: interpolateAttrs(node.attrs, ctx, node.loc),
          children: expandNodes(node.children, ctx),
        },
      ];

    case "text":
    case "comment":
    case "error":
      return [node];
  }
}

function expandComponent(
  component: DefineNode,
  usage: Extract<Node, { type: "object" }>,
  ctx: Ctx,
): Node[] {
  const key = resolvePath(component.name);

  if (ctx.stack.includes(key)) {
    throw new HTSLError(
      `récursion infinie détectée dans le composant "${component.name}".`,
      usage.loc,
      ctx.source,
    );
  }
  if (ctx.stack.length >= MAX_COMPONENT_DEPTH) {
    throw new HTSLError(
      `profondeur maximale de composants (${MAX_COMPONENT_DEPTH}) dépassée.`,
      usage.loc,
      ctx.source,
    );
  }

  // Parameters: from the usage attributes (interpolated in the outer scope),
  // falling back to defaults. A missing required parameter is an error.
  const vars = new Map(ctx.vars);
  for (const param of component.params) {
    let raw = usage.attrs[param.name];
    if (raw === undefined) {
      if (param.default === null) {
        throw new HTSLError(
          `paramètre obligatoire "${param.name}" manquant pour le composant "${component.name}".`,
          usage.loc,
          ctx.source,
        );
      }
      raw = param.default;
    }
    vars.set(param.name, interpolate(raw, ctx, usage.loc));
  }

  // The usage children are expanded in the OUTER scope, then injected as
  // `{$children}` inside the body.
  const children = expandNodes(usage.children, ctx);

  const childCtx: Ctx = {
    components: ctx.components,
    vars,
    children,
    stack: [...ctx.stack, key],
    source: ctx.source,
  };
  const result = expandNodes(component.body, childCtx);

  // The expanded nodes are fresh copies (element/object are spread). Their
  // internal ranges point at the *template* — drop them, then mark the instance
  // roots with the component name + the **call site** range, so the preview edits
  // this instance's usage `{@name[…]: children}` (its own params and children).
  stripRanges(result);
  for (const node of result) {
    if (node.type === "element" || node.type === "object") {
      node.component = component.name;
      if (usage.range) node.range = usage.range;
    }
  }
  return result;
}

/** Recursively remove element/object source ranges (in place, on fresh copies). */
function stripRanges(nodes: Node[]): void {
  for (const node of nodes) {
    if (node.type === "element" || node.type === "object") {
      delete node.range;
      stripRanges(node.children);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function interpolateAttrs(
  attrs: Record<string, string>,
  ctx: Ctx,
  loc: Loc,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(attrs)) {
    out[name] = interpolate(value, ctx, loc);
  }
  return out;
}

function interpolate(value: string, ctx: Ctx, loc: Loc): string {
  return value.replace(VAR_PATTERN, (_match, name: string) => {
    if (name === "children") {
      throw new HTSLError(
        `"{$children}" ne peut pas être utilisé dans une valeur d'attribut.`,
        loc,
        ctx.source,
      );
    }
    const v = ctx.vars.get(name);
    if (v === undefined) {
      throw new HTSLError(`variable inconnue : "${name}".`, loc, ctx.source);
    }
    return v;
  });
}

/** Flatten already-expanded nodes to a plain string (for `{!set}` values). */
function stringifyNodes(nodes: Node[]): string {
  let s = "";
  for (const node of nodes) {
    if (node.type === "text") s += node.value;
    else if (node.type === "element" || node.type === "object") {
      s += stringifyNodes(node.children);
    }
  }
  return s.trim();
}
