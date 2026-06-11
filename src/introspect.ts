/**
 * Introspection API.
 *
 * `registry.list()` / `registry.describe()` expose the static object registry;
 * `registry.components()` / `registry.variables()` introspect a parsed document
 * (its `{!define}` components and `{!set}` variables). Used by tooling such as
 * the playground's contextual autocompletion.
 */
import { describeObject, listObjects } from "./objects/registry.js";
import type { Node } from "./types.js";

export interface ComponentInfo {
  name: string;
  params: { name: string; default: string | null }[];
}

/** Components declared via `{!define}` anywhere in the document. */
export function documentComponents(ast: Node[]): ComponentInfo[] {
  const out: ComponentInfo[] = [];
  const seen = new Set<string>();
  const walk = (node: Node): void => {
    if (node.type === "define") {
      if (!seen.has(node.name)) {
        seen.add(node.name);
        out.push({ name: node.name, params: node.params.map((p) => ({ name: p.name, default: p.default })) });
      }
      node.body.forEach(walk);
      return;
    }
    if (node.type === "element" || node.type === "object") node.children.forEach(walk);
    else if (node.type === "set") node.value.forEach(walk);
  };
  ast.forEach(walk);
  return out;
}

/** Variable names introduced via `{!set}` anywhere in the document. */
export function documentVariables(ast: Node[]): string[] {
  const names = new Set<string>();
  const walk = (node: Node): void => {
    if (node.type === "set") {
      names.add(node.name);
      node.value.forEach(walk);
      return;
    }
    if (node.type === "element" || node.type === "object") node.children.forEach(walk);
    else if (node.type === "define") node.body.forEach(walk);
  };
  ast.forEach(walk);
  return [...names];
}

/** The public introspection facade (`htsl.registry`). */
export const registry = {
  list: listObjects,
  describe: describeObject,
  components: documentComponents,
  variables: documentVariables,
};
