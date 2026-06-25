/**
 * HTSL parser — a hand-written recursive-descent parser turning a token stream
 * into an AST.
 *
 * Grammar (reference):
 *
 *   document   = { node } ;
 *   node       = element | comment | text ;
 *   element    = "{" tag [ id ] { class } [ attrs ] ( ":" content | "/" ) "}" ;
 *   comment    = "{!--" any "--}" ;
 *   attrs      = "[" attr { "," attr } "]" ;
 *   attr       = identifier "=" value ;
 *   content    = { node } ;
 *   identifier = letter { letter | digit | "-" | "_" } ;
 *
 * In `strict` mode the first error throws an {@link HTSLError}. In `tolerant`
 * mode an {@link ErrorNode} is inserted into the AST and parsing resumes.
 */
import { HTSLError } from "./errors.js";
import { tokenize } from "./lexer.js";
import { contentModelOf, resolvePath } from "./objects/registry.js";
import type {
  DefineNode,
  ElementNode,
  ErrorNode,
  Loc,
  Node,
  ObjectNode,
  Param,
  ParseOptions,
  SetNode,
  Token,
} from "./types.js";

const DEFAULT_MAX_DEPTH = 256;
const VALID_IDENT = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function parse(source: string, options: ParseOptions = {}): Node[] {
  const mode = options.mode ?? "strict";
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const tokens = tokenize(source, mode);
  return new Parser(source, tokens, mode === "tolerant", maxDepth, options.ranges ?? false).parseDocument();
}

class Parser {
  private pos = 0;

  constructor(
    private readonly src: string,
    private readonly tokens: Token[],
    private readonly tolerant: boolean,
    private readonly maxDepth: number,
    private readonly ranges: boolean,
  ) {}

  /** Build a text node, attaching the source range when range-tracking is on. */
  private textNode(t: Token): Node {
    if (this.ranges && t.start !== undefined && t.end !== undefined) {
      return { type: "text", value: t.value, loc: t.loc, range: [t.start, t.end] };
    }
    return { type: "text", value: t.value, loc: t.loc };
  }

  parseDocument(): Node[] {
    const nodes: Node[] = [];
    while (!this.check("EOF")) {
      const before = this.pos;
      const node = this.parseNode(1);
      this.collect(nodes, node);
      // Defensive: never spin without consuming a token.
      if (this.pos === before) this.advance();
    }
    return nodes;
  }

  /* ----------------------------------------------------------------------- */
  /* Nodes                                                                   */
  /* ----------------------------------------------------------------------- */

  private parseNode(depth: number): Node | null {
    const t = this.peek();
    switch (t.type) {
      case "COMMENT":
        this.advance();
        return { type: "comment", value: t.value, loc: t.loc };
      case "TEXT":
        this.advance();
        return this.textNode(t);
      case "LBRACE":
        return this.parseElementSafe(depth);
      case "OBJOPEN":
        return this.parseObjectSafe(depth);
      case "DEFINE_OPEN":
        return this.parseDefine(depth);
      case "SET_OPEN":
        return this.parseSet(depth);
      case "VARREF":
        this.advance();
        return { type: "var", name: t.value, loc: t.loc };
      case "MATH_TEXT":
        this.advance();
        return { type: "text", value: t.value, loc: t.loc };
      case "RBRACE":
        return this.recoverable("accolade fermante orpheline.", t.loc, () =>
          this.advance(),
        );
      case "EOF":
        return null;
      default:
        return this.recoverable(`jeton inattendu : "${t.value}".`, t.loc, () =>
          this.advance(),
        );
    }
  }

  /** Wraps {@link parseElement} so that, in tolerant mode, a thrown error is
   * turned into an {@link ErrorNode} and parsing resumes after the next `}`. */
  private parseElementSafe(depth: number): Node {
    if (!this.tolerant) return this.parseElement(depth);
    const start = this.peek().loc;
    try {
      return this.parseElement(depth);
    } catch (err) {
      if (!(err instanceof HTSLError)) throw err;
      this.skipToClosing();
      return { type: "error", message: stripPrefix(err.message), loc: start };
    }
  }

  private parseElement(depth: number): ElementNode {
    const openTok = this.peek(); // "{"
    const startLoc = openTok.loc;
    const openStart = openTok.start;
    this.advance(); // consume "{"

    if (depth > this.maxDepth) {
      this.fail(
        `profondeur d'imbrication maximale (${this.maxDepth}) dépassée.`,
        startLoc,
      );
    }

    const tag = this.parseTag(startLoc);

    let id: string | null = null;
    const classes: string[] = [];
    const attrs: Record<string, string> = {};

    // [ id ] { class } [ attrs ] — order-tolerant loop
    loop: for (;;) {
      const t = this.peek();
      switch (t.type) {
        case "HASH": {
          this.advance();
          id = this.parseIdent("identifiant");
          break;
        }
        case "DOT": {
          this.advance();
          classes.push(this.parseIdent("classe"));
          break;
        }
        case "LBRACKET": {
          this.parseAttrs(attrs);
          break;
        }
        default:
          break loop;
      }
    }

    const t = this.peek();
    if (t.type === "SLASH") {
      this.advance();
      const closeEnd = this.peek().end; // RBRACE
      this.expect("RBRACE", `balise "{${tag}" jamais fermée.`, startLoc);
      return this.element(tag, id, classes, attrs, true, [], startLoc, this.range(openStart, closeEnd));
    }

    if (t.type === "COLON") {
      this.advance();
      const children = this.parseContent(depth);
      if (this.check("EOF")) {
        this.fail(`balise "{${tag}" jamais fermée.`, startLoc);
      }
      const closeEnd = this.peek().end; // RBRACE
      this.advance(); // consume "}"
      return this.element(tag, id, classes, attrs, false, children, startLoc, this.range(openStart, closeEnd));
    }

    if (t.type === "EOF") {
      this.fail(`balise "{${tag}" jamais fermée.`, startLoc);
    }
    this.fail(`attendu ":" ou "/" pour fermer la balise "{${tag}".`, t.loc);
  }

  /* ----------------------------------------------------------------------- */
  /* Objects                                                                 */
  /* ----------------------------------------------------------------------- */

  private parseObjectSafe(depth: number): Node {
    if (!this.tolerant) return this.parseObject(depth);
    const start = this.peek().loc;
    try {
      return this.parseObject(depth);
    } catch (err) {
      if (!(err instanceof HTSLError)) throw err;
      this.skipToClosing();
      return { type: "error", message: stripPrefix(err.message), loc: start };
    }
  }

  private parseObject(depth: number): ObjectNode {
    const open = this.peek(); // OBJOPEN
    const startLoc = open.loc;
    const openStart = open.start;
    const rawPath = open.value;
    this.advance();

    if (depth > this.maxDepth) {
      this.fail(
        `profondeur d'imbrication maximale (${this.maxDepth}) dépassée.`,
        startLoc,
      );
    }

    const attrs: Record<string, string> = {};
    if (this.check("LBRACKET")) this.parseAttrs(attrs);

    const path = resolvePath(rawPath);
    const t = this.peek();

    if (t.type === "SLASH") {
      this.advance();
      const closeEnd = this.peek().end; // RBRACE
      this.expect("RBRACE", `objet "{@${rawPath}" jamais fermé.`, startLoc);
      return this.object(path, rawPath, attrs, true, [], startLoc, this.range(openStart, closeEnd));
    }

    if (t.type === "COLON") {
      this.advance();
      const children =
        contentModelOf(rawPath) === "math"
          ? this.parseMathContent(depth)
          : this.parseContent(depth);
      if (this.check("EOF")) {
        this.fail(`objet "{@${rawPath}" jamais fermé.`, startLoc);
      }
      const closeEnd = this.peek().end; // RBRACE
      this.advance(); // consume "}"
      return this.object(path, rawPath, attrs, false, children, startLoc, this.range(openStart, closeEnd));
    }

    if (t.type === "EOF") {
      this.fail(`objet "{@${rawPath}" jamais fermé.`, startLoc);
    }
    this.fail(`attendu ":" ou "/" pour fermer l'objet "{@${rawPath}".`, t.loc);
  }

  /** Math content keeps every text run verbatim (LaTeX whitespace matters). */
  private parseMathContent(depth: number): Node[] {
    const children: Node[] = [];
    while (!this.check("RBRACE") && !this.check("EOF")) {
      const before = this.pos;
      const t = this.peek();
      if (t.type === "MATH_TEXT") {
        this.advance();
        children.push({ type: "text", value: t.value, loc: t.loc });
      } else if (t.type === "OBJOPEN") {
        children.push(this.parseObjectSafe(depth + 1));
      } else if (t.type === "VARREF") {
        this.advance();
        children.push({ type: "var", name: t.value, loc: t.loc });
      } else {
        this.advance(); // defensive: skip anything unexpected
      }
      if (this.pos === before) this.advance();
    }
    return children;
  }

  /* ----------------------------------------------------------------------- */
  /* Components & variables                                                  */
  /* ----------------------------------------------------------------------- */

  private parseDefine(depth: number): DefineNode {
    const open = this.peek(); // DEFINE_OPEN
    const startLoc = open.loc;
    const openStart = open.start;
    const name = open.value;
    this.advance();

    if (name === "") {
      this.fail(`nom de composant attendu après "{!define".`, startLoc);
    }

    const params = this.check("LBRACKET") ? this.parseParams() : [];

    this.expect("COLON", `attendu ":" dans la définition du composant "${name}".`, this.peek().loc);
    const body = this.parseContent(depth);
    if (this.check("EOF")) {
      this.fail(`composant "{!define ${name}" jamais fermé.`, startLoc);
    }
    const closeEnd = this.peek().end; // RBRACE
    this.advance(); // consume "}"
    const range = this.range(openStart, closeEnd);
    return { type: "define", name, params, body, loc: startLoc, ...(range ? { range } : {}) };
  }

  private parseParams(): Param[] {
    const params: Param[] = [];
    this.advance(); // consume "["
    if (this.check("RBRACKET")) {
      this.advance();
      return params;
    }
    for (;;) {
      const name = this.peek();
      if (name.type !== "IDENT") {
        this.fail(`nom de paramètre attendu.`, name.loc);
      }
      this.advance();
      let def: string | null = null;
      if (this.check("EQUALS")) {
        this.advance();
        const value = this.peek();
        if (value.type === "STRING" || value.type === "IDENT") {
          this.advance();
          def = value.value;
        } else {
          this.fail(`valeur par défaut attendue pour "${name.value}".`, value.loc);
        }
      }
      params.push({ name: name.value, default: def });
      if (this.check("COMMA")) {
        this.advance();
        continue;
      }
      break;
    }
    this.expect("RBRACKET", `"]" attendu dans la liste des paramètres.`, this.peek().loc);
    return params;
  }

  private parseSet(depth: number): SetNode {
    const open = this.peek(); // SET_OPEN
    const startLoc = open.loc;
    const name = open.value;
    this.advance();

    if (name === "") {
      this.fail(`nom de variable attendu après "{!set".`, startLoc);
    }

    this.expect("COLON", `attendu ":" dans l'affectation "{!set ${name}".`, this.peek().loc);
    const value = this.parseContent(depth);
    if (this.check("EOF")) {
      this.fail(`affectation "{!set ${name}" jamais fermée.`, startLoc);
    }
    this.advance(); // consume "}"
    return { type: "set", name, value, loc: startLoc };
  }

  private object(
    path: string,
    rawPath: string,
    attrs: Record<string, string>,
    selfClosing: boolean,
    children: Node[],
    loc: Loc,
    range?: [number, number],
  ): ObjectNode {
    return { type: "object", path, rawPath, attrs, selfClosing, children, loc, ...(range ? { range } : {}) };
  }

  /** Build a source range when range-tracking is on and both ends are known. */
  private range(start: number | undefined, end: number | undefined): [number, number] | undefined {
    return this.ranges && start !== undefined && end !== undefined ? [start, end] : undefined;
  }

  private parseContent(depth: number): Node[] {
    const children: Node[] = [];
    while (!this.check("RBRACE") && !this.check("EOF")) {
      const before = this.pos;
      const node = this.parseNode(depth + 1);
      this.collect(children, node);
      if (this.pos === before) this.advance();
    }
    return children;
  }

  private parseTag(startLoc: Loc): string {
    const t = this.peek();
    if (t.type === "EOF") {
      this.fail(`balise jamais fermée.`, startLoc);
    }
    if (t.type !== "IDENT") {
      this.fail(`nom de balise attendu après "{".`, t.loc);
    }
    if (!VALID_IDENT.test(t.value)) {
      this.fail(`identifiant de balise invalide : "${t.value}".`, t.loc);
    }
    this.advance();
    return t.value;
  }

  private parseIdent(kind: string): string {
    const t = this.peek();
    if (t.type !== "IDENT") {
      this.fail(`nom de ${kind} attendu.`, t.loc);
    }
    if (!VALID_IDENT.test(t.value)) {
      this.fail(`identifiant de ${kind} invalide : "${t.value}".`, t.loc);
    }
    this.advance();
    return t.value;
  }

  private parseAttrs(attrs: Record<string, string>): void {
    const open = this.peek().loc;
    this.advance(); // consume "["
    if (this.check("RBRACKET")) {
      this.advance();
      return;
    }
    for (;;) {
      const name = this.peek();
      if (name.type !== "IDENT" || !VALID_IDENT.test(name.value)) {
        this.fail(`attribut malformé : nom d'attribut invalide.`, name.loc);
      }
      this.advance();

      // Bare boolean attribute: `[controls]` (no `=value`) is shorthand for a
      // present HTML boolean attribute. We store "true" so renderers/consumers
      // that test attrs uniformly keep working; the renderer emits it bare.
      if (!this.check("EQUALS")) {
        attrs[name.value] = "true";
      } else {
        this.advance(); // consume "="
        const value = this.peek();
        if (value.type === "STRING" || value.type === "IDENT") {
          this.advance();
          attrs[name.value] = value.value;
        } else {
          this.fail(
            `attribut malformé : valeur attendue pour "${name.value}".`,
            value.loc,
          );
        }
      }

      if (this.check("COMMA")) {
        this.advance();
        continue;
      }
      break;
    }
    this.expect("RBRACKET", `attribut malformé : "]" attendu.`, open);
  }

  /* ----------------------------------------------------------------------- */
  /* Helpers                                                                 */
  /* ----------------------------------------------------------------------- */

  private element(
    tag: string,
    id: string | null,
    classes: string[],
    attrs: Record<string, string>,
    selfClosing: boolean,
    children: Node[],
    loc: Loc,
    range?: [number, number],
  ): ElementNode {
    return { type: "element", tag, id, classes, attrs, selfClosing, children, loc, ...(range ? { range } : {}) };
  }

  /** Push a node, dropping whitespace-only text nodes (insignificant layout). */
  private collect(target: Node[], node: Node | null): void {
    if (node === null) return;
    if (node.type === "text" && node.value.trim() === "") return;
    target.push(node);
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? this.tokens[this.tokens.length - 1]!;
  }

  private check(type: Token["type"]): boolean {
    return this.peek().type === type;
  }

  private advance(): Token {
    const t = this.peek();
    if (this.pos < this.tokens.length - 1) this.pos++;
    return t;
  }

  private expect(type: Token["type"], message: string, loc: Loc): void {
    if (this.check(type)) {
      this.advance();
      return;
    }
    this.fail(message, loc);
  }

  /** Always throws an {@link HTSLError}. Used inside element parsing, where the
   * tolerant-mode catch lives in {@link parseElementSafe}. */
  private fail(message: string, loc: Loc): never {
    throw new HTSLError(message, loc, this.src);
  }

  /** Mode-aware error used at content/document level, where there is no
   * surrounding try/catch. Throws in strict mode, recovers in tolerant mode. */
  private recoverable(message: string, loc: Loc, recover: () => void): ErrorNode {
    if (!this.tolerant) throw new HTSLError(message, loc, this.src);
    recover();
    return { type: "error", message, loc };
  }

  /** Tolerant-mode recovery: advance past the next unmatched "}" (or EOF). */
  private skipToClosing(): void {
    while (!this.check("EOF") && !this.check("RBRACE")) this.advance();
    if (this.check("RBRACE")) this.advance();
  }
}

/** Removes the "HTSL Error (...) : " prefix, keeping the bare message. */
function stripPrefix(message: string): string {
  const idx = message.indexOf(" : ");
  const firstLine = message.split("\n", 1)[0] ?? message;
  return idx >= 0 ? firstLine.slice(idx + 3) : firstLine;
}
