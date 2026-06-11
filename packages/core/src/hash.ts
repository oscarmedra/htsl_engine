/**
 * Stable structural hash of an AST subtree.
 *
 * Used by the renderer's `hashBlocks` option to stamp `data-htsl-hash` on
 * top-level nodes, math blocks and scenes, so a DOM-morphing host can keep a
 * block whose hash is unchanged without inspecting it.
 */
import type { Node } from "./types.js";

export function htslHash(node: Node): string {
  return fnv1a(serialize(node));
}

function serialize(node: Node): string {
  switch (node.type) {
    case "text":
      return "T" + node.value;
    case "comment":
      return "C" + node.value;
    case "var":
      return "V" + node.name;
    case "error":
      return "X" + node.message;
    case "element":
      return (
        "E" + node.tag + "#" + (node.id ?? "") + "." + node.classes.join(".") +
        attrs(node.attrs) + (node.selfClosing ? "/" : "") + kids(node.children)
      );
    case "object":
      return "O" + node.path + attrs(node.attrs) + (node.selfClosing ? "/" : "") + kids(node.children);
    case "define":
      return "D" + node.name;
    case "set":
      return "S" + node.name;
  }
}

function attrs(a: Record<string, string>): string {
  return "[" + Object.keys(a).sort().map((k) => `${k}=${a[k]}`).join(";") + "]";
}

function kids(nodes: Node[]): string {
  return "(" + nodes.map(serialize).join(",") + ")";
}

/** FNV-1a → base36. Deterministic, fast, dependency-free. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
