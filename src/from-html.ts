/**
 * Reverse conversion: HTML → HTSL.
 *
 * `parseHtml` is a small hand-written, dependency-free HTML parser producing the
 * same {@link Node} AST used by the forward pipeline. `toHtsl` serializes that
 * AST back to HTSL source. `fromHtml` chains the two.
 *
 * Scope (v0.1): handles well-formed HTML — elements, attributes (quoted,
 * unquoted and boolean), void elements, self-closing tags, comments, doctype
 * (ignored) and the common HTML entities. It is lenient (never throws) and
 * auto-closes any element left open at end of input.
 */
import type { ElementNode, Loc, Node, ObjectNode } from "./types.js";

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

const VALID_IDENT = /^[A-Za-z][A-Za-z0-9_-]*$/;
const UNQUOTED_VALUE = /^[A-Za-z0-9_-]+$/;

/* -------------------------------------------------------------------------- */
/* HTML → AST                                                                 */
/* -------------------------------------------------------------------------- */

export function parseHtml(html: string): Node[] {
  return new HtmlParser(html).parse();
}

class HtmlParser {
  private pos = 0;
  private line = 1;
  private col = 1;

  constructor(private readonly src: string) {}

  parse(): Node[] {
    const root: Node[] = [];
    const stack: ElementNode[] = [];
    const current = (): Node[] => {
      const top = stack[stack.length - 1];
      return top ? top.children : root;
    };

    while (!this.eof()) {
      if (this.startsWith("<!--")) {
        current().push(this.readComment());
        continue;
      }
      if (this.startsWith("<!") || this.startsWith("<?")) {
        this.skipUntil(">"); // doctype / processing instruction — ignored
        continue;
      }
      if (this.startsWith("</")) {
        this.readCloseTag(stack);
        continue;
      }
      if (this.peek() === "<" && isLetter(this.peek(1))) {
        const { node, selfClosed } = this.readOpenTag();
        current().push(node);
        if (!selfClosed && !VOID_TAGS.has(node.tag)) stack.push(node);
        continue;
      }
      // plain text run
      current().push(this.readText());
    }
    return root;
  }

  private readText(): Node {
    const loc = this.loc();
    // Consume at least one character so a literal "<" that is not a tag start
    // (e.g. "<", "< ") is treated as text and never stalls the scanner.
    let raw = this.advance();
    while (!this.eof() && this.peek() !== "<") raw += this.advance();
    return { type: "text", value: decodeEntities(raw), loc };
  }

  private readComment(): Node {
    const loc = this.loc();
    this.consume("<!--");
    let value = "";
    while (!this.eof() && !this.startsWith("-->")) value += this.advance();
    if (this.startsWith("-->")) this.consume("-->");
    return { type: "comment", value, loc };
  }

  private readCloseTag(stack: ElementNode[]): void {
    this.consume("</");
    const name = this.readName().toLowerCase();
    this.skipUntil(">");
    // Pop to the nearest matching open element (auto-closing intervening ones).
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i]!.tag === name) {
        stack.length = i;
        return;
      }
    }
    // No matching open tag: ignore the stray close.
  }

  private readOpenTag(): { node: ElementNode; selfClosed: boolean } {
    const loc = this.loc();
    this.advance(); // "<"
    const tag = this.readName().toLowerCase();
    const rawAttrs: Array<[string, string]> = [];
    let selfClosed = false;

    for (;;) {
      this.skipWhitespace();
      const ch = this.peek();
      if (ch === "" || ch === ">") {
        if (ch === ">") this.advance();
        break;
      }
      if (ch === "/") {
        this.advance();
        if (this.peek() === ">") {
          this.advance();
          selfClosed = true;
        }
        break;
      }
      const name = this.readAttrName();
      if (name === "") {
        this.advance(); // avoid stalling on an unexpected character
        continue;
      }
      this.skipWhitespace();
      let value = "";
      if (this.peek() === "=") {
        this.advance();
        this.skipWhitespace();
        value = this.readAttrValue();
      }
      rawAttrs.push([name, value]);
    }

    return { node: this.buildElement(tag, rawAttrs, loc), selfClosed };
  }

  private buildElement(
    tag: string,
    rawAttrs: Array<[string, string]>,
    loc: Loc,
  ): ElementNode {
    let id: string | null = null;
    const classes: string[] = [];
    const attrs: Record<string, string> = {};

    for (const [name, value] of rawAttrs) {
      const lname = name.toLowerCase();
      if (lname === "id" && id === null && VALID_IDENT.test(value)) {
        id = value;
        continue;
      }
      if (lname === "class") {
        const tokens = value.split(/\s+/).filter(Boolean);
        if (tokens.length > 0 && tokens.every((t) => VALID_IDENT.test(t))) {
          classes.push(...tokens);
          continue;
        }
      }
      attrs[name] = value;
    }

    return {
      type: "element",
      tag,
      id,
      classes,
      attrs,
      selfClosing: false,
      children: [],
      loc,
    };
  }

  /* --- scanning primitives --- */

  private readName(): string {
    let name = "";
    while (!this.eof()) {
      const ch = this.peek();
      if (/[A-Za-z0-9:-]/.test(ch)) name += this.advance();
      else break;
    }
    return name;
  }

  private readAttrName(): string {
    let name = "";
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === "=" || ch === ">" || ch === "/" || isWhitespace(ch)) break;
      name += this.advance();
    }
    return name;
  }

  private readAttrValue(): string {
    const quote = this.peek();
    if (quote === '"' || quote === "'") {
      this.advance();
      let value = "";
      while (!this.eof() && this.peek() !== quote) value += this.advance();
      if (this.peek() === quote) this.advance();
      return decodeEntities(value);
    }
    let value = "";
    while (!this.eof() && !isWhitespace(this.peek()) && this.peek() !== ">") {
      value += this.advance();
    }
    return decodeEntities(value);
  }

  private skipWhitespace(): void {
    while (!this.eof() && isWhitespace(this.peek())) this.advance();
  }

  private skipUntil(marker: string): void {
    while (!this.eof() && !this.startsWith(marker)) this.advance();
    if (this.startsWith(marker)) this.consume(marker);
  }

  private consume(text: string): void {
    for (let i = 0; i < text.length; i++) this.advance();
  }

  private eof(): boolean {
    return this.pos >= this.src.length;
  }

  private peek(offset = 0): string {
    return this.src[this.pos + offset] ?? "";
  }

  private startsWith(text: string): boolean {
    return this.src.startsWith(text, this.pos);
  }

  private advance(): string {
    const ch = this.src[this.pos];
    if (ch === undefined) return "";
    this.pos++;
    if (ch === "\n") {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  private loc(): Loc {
    return { line: this.line, col: this.col };
  }
}

/* -------------------------------------------------------------------------- */
/* AST → HTSL                                                                  */
/* -------------------------------------------------------------------------- */

export interface ToHtslOptions {
  /** Indent the output (default true). When false, emits a single compact line. */
  prettyPrint?: boolean;
}

export function toHtsl(ast: Node | Node[], options: ToHtslOptions = {}): string {
  const pretty = options.prettyPrint ?? true;
  const nodes = (Array.isArray(ast) ? ast : [ast]).filter(notBlank);
  if (pretty) {
    return nodes.map((n) => serializePretty(n, 0)).join("\n");
  }
  return nodes.map((n) => serializeCompact(n)).join("");
}

/** Convenience: HTML string → HTSL string. */
export function fromHtml(html: string, options: ToHtslOptions = {}): string {
  return toHtsl(parseHtml(html), options);
}

function serializePretty(node: Node, indent: number): string {
  const pad = "  ".repeat(indent);
  switch (node.type) {
    case "text":
      return pad + escapeText(node.value.trim());
    case "comment":
      return `${pad}{!--${node.value}--}`;
    case "error":
      return `${pad}{!--${node.message}--}`;
    case "object":
      return pad + serializeObject(node, serializeCompact);
    case "define":
    case "set":
    case "var":
      return "";
    case "element": {
      const header = "{" + selector(node);
      const children = node.children.filter(notBlank);
      if (VOID_TAGS.has(node.tag) || children.length === 0) {
        return `${pad}${header}/}`;
      }
      const only = children[0];
      if (children.length === 1 && only && only.type === "text") {
        return `${pad}${header}:${escapeText(only.value.trim())}}`;
      }
      const lines = [`${pad}${header}:`];
      for (const child of children) lines.push(serializePretty(child, indent + 1));
      lines.push(`${pad}}`);
      return lines.join("\n");
    }
  }
}

function serializeCompact(node: Node): string {
  switch (node.type) {
    case "text":
      return escapeText(node.value);
    case "comment":
      return `{!--${node.value}--}`;
    case "error":
      return `{!--${node.message}--}`;
    case "object":
      return serializeObject(node, serializeCompact);
    case "define":
    case "set":
    case "var":
      return "";
    case "element": {
      const header = "{" + selector(node);
      const children = node.children.filter(notBlank);
      if (VOID_TAGS.has(node.tag) || children.length === 0) return `${header}/}`;
      return `${header}:${children.map(serializeCompact).join("")}}`;
    }
  }
}

/** Serialize an object node back to `{@path[attrs]:...}` / `{@path[attrs]/}`. */
function serializeObject(
  node: ObjectNode,
  child: (n: Node) => string,
): string {
  let header = `{@${node.rawPath || node.path}`;
  const entries = Object.entries(node.attrs);
  if (entries.length > 0) {
    header += "[" + entries.map(([k, v]) => `${k}=${valueLiteral(v)}`).join(", ") + "]";
  }
  if (node.selfClosing || node.children.length === 0) return `${header}/}`;
  return `${header}:${node.children.map(child).join("")}}`;
}

function selector(node: ElementNode): string {
  let s = node.tag;
  if (node.id !== null) s += `#${node.id}`;
  for (const c of node.classes) s += `.${c}`;
  const entries = Object.entries(node.attrs);
  if (entries.length > 0) {
    s += "[" + entries.map(([k, v]) => `${k}=${valueLiteral(v)}`).join(", ") + "]";
  }
  return s;
}

function valueLiteral(value: string): string {
  if (value !== "" && UNQUOTED_VALUE.test(value)) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Escape the characters that are structural in HTSL text. */
function escapeText(text: string): string {
  return text.replace(/([{}:])/g, "\\$1");
}

function notBlank(node: Node): boolean {
  return !(node.type === "text" && node.value.trim() === "");
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function isLetter(ch: string): boolean {
  return /[A-Za-z]/.test(ch);
}

function isWhitespace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\f";
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}
