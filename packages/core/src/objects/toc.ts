/**
 * Table-of-contents context (B2): collect the document's headings (`h1`…`h6`) in
 * order, give each a stable slug id, and expose them so the renderer can both stamp
 * the ids onto the headings and build the `{@toc}` list of links.
 *
 * Real printed page numbers are out of scope here (they require pagination the
 * browser only computes at print time) — the TOC links jump to each heading.
 */
import type { ElementNode, Node } from "../types.js";

export interface TocEntry {
  level: number; // 1..6
  text: string;
  id: string;
}

export interface TocContext {
  /** Heading element → the id to stamp on it. */
  ids: Map<ElementNode, string>;
  /** Headings in document order. */
  entries: TocEntry[];
}

const HEADING = /^h([1-6])$/;

/** Slugify heading text into a URL-safe, unique id. */
function slugify(text: string, used: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // strip accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "section";
  let id = base;
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

/** Plain-text content of an element (headings hold inline text). */
function textOf(node: Node): string {
  if (node.type === "text") return node.value;
  if (node.type === "element" || node.type === "object") {
    return node.children.map(textOf).join("");
  }
  return "";
}

/** Does the tree contain a `{@toc}` object? (No TOC → no heading ids injected, so
 *  documents that don't use it keep byte-for-byte identical output.) */
function hasToc(nodes: Node[]): boolean {
  const find = (n: Node): boolean => {
    if (n.type === "object" && n.path === "toc") return true;
    const kids = (n as { children?: Node[] }).children;
    return Array.isArray(kids) && kids.some(find);
  };
  return nodes.some(find);
}

export function buildTocContext(nodes: Node[]): TocContext {
  const ids = new Map<ElementNode, string>();
  const entries: TocEntry[] = [];
  if (!hasToc(nodes)) return { ids, entries };
  const used = new Set<string>();

  const walk = (node: Node): void => {
    if (node.type === "element") {
      const m = HEADING.exec(node.tag);
      if (m) {
        const text = textOf(node).trim();
        const id = node.id ?? slugify(text, used);
        if (!node.id) ids.set(node, id);
        else used.add(node.id);
        entries.push({ level: Number(m[1]), text, id });
      }
      node.children.forEach(walk);
    } else if (node.type === "object") {
      node.children.forEach(walk);
    }
  };

  nodes.forEach(walk);
  return { ids, entries };
}

/** Render a `{@toc}` list from the collected entries. `maxLevel` caps the depth. */
export function renderToc(entries: TocEntry[], maxLevel: number, title: string | undefined): string {
  const items = entries
    .filter((e) => e.level <= maxLevel)
    .map(
      (e) =>
        `<li class="htsl-toc-l${e.level}"><a href="#${e.id}">${escapeText(e.text)}</a></li>`,
    )
    .join("");
  const heading = title ? `<div class="htsl-toc-title">${escapeText(title)}</div>` : "";
  return `<nav class="htsl-toc">${heading}<ul>${items}</ul></nav>`;
}

/** Minimal text escape (headings are plain text here). */
function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
