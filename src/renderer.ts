/**
 * HTSL renderer — turns an AST into an HTML string.
 *
 * Security: all text content and attribute values are HTML-escaped by default
 * (`<`, `>`, `&`, `"`). This is non-negotiable (XSS prevention). When
 * `allowedTags` is provided, any element whose tag is not listed is serialized
 * and emitted as escaped text rather than as a live HTML element.
 */
import type { ElementNode, Node, RenderOptions } from "./types.js";

/** HTML void elements: rendered without a closing tag and never with children. */
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

export function render(ast: Node | Node[], options: RenderOptions = {}): string {
  const nodes = Array.isArray(ast) ? ast : [ast];
  return new Renderer(options).renderTop(nodes);
}

class Renderer {
  private readonly pretty: boolean;
  private readonly allowedTags: Set<string> | null;

  constructor(options: RenderOptions) {
    this.pretty = options.prettyPrint ?? false;
    this.allowedTags = options.allowedTags ? new Set(options.allowedTags) : null;
  }

  renderTop(nodes: Node[]): string {
    const visible = nodes.filter((n) => n.type !== "comment");
    if (this.pretty) {
      return visible.map((n) => this.pretty0(n, 0)).join("\n");
    }
    return visible.map((n) => this.compact(n)).join("");
  }

  /* ----------------------------------------------------------------------- */
  /* Compact rendering                                                       */
  /* ----------------------------------------------------------------------- */

  private compact(node: Node): string {
    switch (node.type) {
      case "text":
        return escapeHtml(node.value);
      case "comment":
        return "";
      case "error":
        return htmlComment(node.message);
      case "element":
        return this.compactElement(node);
    }
  }

  private compactElement(node: ElementNode): string {
    if (this.isBlocked(node.tag)) {
      return escapeHtml(rawHtml(node));
    }
    const open = openTag(node);
    if (VOID_TAGS.has(node.tag)) return open;
    const inner = node.children
      .filter((c) => c.type !== "comment")
      .map((c) => this.compact(c))
      .join("");
    return `${open}${inner}</${node.tag}>`;
  }

  /* ----------------------------------------------------------------------- */
  /* Pretty rendering                                                        */
  /* ----------------------------------------------------------------------- */

  private pretty0(node: Node, indent: number): string {
    const pad = "  ".repeat(indent);
    switch (node.type) {
      case "text":
        return pad + escapeHtml(node.value.trim());
      case "comment":
        return "";
      case "error":
        return pad + htmlComment(node.message);
      case "element":
        return this.prettyElement(node, indent);
    }
  }

  private prettyElement(node: ElementNode, indent: number): string {
    const pad = "  ".repeat(indent);
    if (this.isBlocked(node.tag)) {
      return pad + escapeHtml(rawHtml(node));
    }
    const open = openTag(node);
    if (VOID_TAGS.has(node.tag)) return pad + open;

    const children = node.children.filter((c) => c.type !== "comment");
    if (children.length === 0) {
      return `${pad}${open}</${node.tag}>`;
    }
    // Inline a lone text child for compact, readable output.
    const only = children[0];
    if (children.length === 1 && only && only.type === "text") {
      return `${pad}${open}${escapeHtml(only.value.trim())}</${node.tag}>`;
    }
    const lines = [pad + open];
    for (const child of children) lines.push(this.pretty0(child, indent + 1));
    lines.push(`${pad}</${node.tag}>`);
    return lines.join("\n");
  }

  private isBlocked(tag: string): boolean {
    return this.allowedTags !== null && !this.allowedTags.has(tag);
  }
}

/* -------------------------------------------------------------------------- */
/* Serialization helpers                                                      */
/* -------------------------------------------------------------------------- */

function openTag(node: ElementNode): string {
  let s = `<${node.tag}`;
  if (node.id !== null) s += ` id="${escapeHtml(node.id)}"`;
  if (node.classes.length > 0) {
    s += ` class="${escapeHtml(node.classes.join(" "))}"`;
  }
  for (const [name, value] of Object.entries(node.attrs)) {
    s += ` ${name}="${escapeHtml(value)}"`;
  }
  return s + ">";
}

/** Serialize an element subtree to HTML *without* escaping, ignoring the
 * allowedTags policy. The caller escapes the whole result so a blocked element
 * (and everything under it) becomes inert, visible text. */
function rawHtml(node: Node): string {
  switch (node.type) {
    case "text":
      return node.value;
    case "comment":
    case "error":
      return "";
    case "element": {
      let s = `<${node.tag}`;
      if (node.id !== null) s += ` id="${node.id}"`;
      if (node.classes.length > 0) s += ` class="${node.classes.join(" ")}"`;
      for (const [name, value] of Object.entries(node.attrs)) {
        s += ` ${name}="${value}"`;
      }
      s += ">";
      if (VOID_TAGS.has(node.tag)) return s;
      const inner = node.children.map((c) => rawHtml(c)).join("");
      return `${s}${inner}</${node.tag}>`;
    }
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Render a recovered ErrorNode as a safe HTML comment. */
function htmlComment(message: string): string {
  const safe = message.replace(/--+/g, "-").replace(/[<>]/g, "");
  return `<!-- HTSL error: ${safe} -->`;
}
