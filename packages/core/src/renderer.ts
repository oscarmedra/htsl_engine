/**
 * HTSL renderer — turns an AST into an HTML string.
 *
 * Security: all text content and attribute values are HTML-escaped by default
 * (`<`, `>`, `&`, `"`). This is non-negotiable (XSS prevention). When
 * `allowedTags` is provided, any element whose tag is not listed is serialized
 * and emitted as escaped text rather than as a live HTML element.
 */
import { escapeHtml } from "./escape.js";
import { expand } from "./components/expand.js";
import { htslHash } from "./hash.js";
import {
  buildMathContext,
  renderMathObject,
  type MathContext,
} from "./objects/math.js";
import { isThreePath, renderThree } from "./objects/three.js";
import { isPlotPath, renderPlot } from "./objects/plot.js";
import { isChartPath, renderChart } from "./objects/chart.js";
import { isVariationsPath, renderVariations } from "./objects/variations.js";
import { isParamPath, renderParam, buildParamContext, paramValues, type ParamContext } from "./objects/param.js";
import { isSlidePath } from "./objects/slides.js";
import {
  buildCalloutContext,
  calloutId,
  calloutType,
  isCalloutPath,
  CALLOUT_REF_PATH,
  type CalloutContext,
} from "./objects/callout.js";
import type { ElementNode, Node, ObjectNode, RenderOptions, TextNode } from "./types.js";

export { escapeHtml } from "./escape.js";

/** Raw-text elements: their body is emitted verbatim (JS/CSS), never escaped. */
const RAW_TEXT_TAGS = new Set(["script", "style"]);

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
  // Expand components & variables first, so the renderer only sees normal nodes.
  const expanded = expand(
    nodes,
    options.source !== undefined ? { source: options.source } : {},
  );
  return new Renderer(options).renderTop(expanded);
}

class Renderer {
  private readonly pretty: boolean;
  private readonly allowedTags: Set<string> | null;
  private readonly options: RenderOptions;
  private ctx: MathContext = { numbers: new Map(), labels: new Map() };
  private calloutCtx: CalloutContext = { info: new Map(), labels: new Map() };
  private paramCtx: ParamContext = new Map();
  private flashcardCounter = 0;

  constructor(options: RenderOptions) {
    this.options = options;
    this.pretty = options.prettyPrint ?? false;
    this.allowedTags = options.allowedTags ? new Set(options.allowedTags) : null;
  }

  renderTop(nodes: Node[]): string {
    this.ctx = buildMathContext(nodes);
    this.calloutCtx = buildCalloutContext(nodes);
    this.paramCtx = buildParamContext(nodes);
    const visible = nodes.filter((n) => n.type !== "comment");
    if (this.pretty) {
      return visible
        .map((n) => (n.type === "element" ? this.prettyElement(n, 0, this.hashAttr(n)) : this.pretty0(n, 0)))
        .join("\n");
    }
    return visible
      .map((n) => (n.type === "element" ? this.compactElement(n, this.hashAttr(n)) : this.compact(n)))
      .join("");
  }

  /** ` data-htsl-hash="…"` for a top-level node, or "" when hashing is off. */
  private hashAttr(node: Node): string {
    return this.options.hashBlocks ? ` data-htsl-hash="${htslHash(node)}"` : "";
  }

  /** ` data-htsl-range="start-end"` so the preview can edit an element's source. */
  private rangeAttr(node: ElementNode): string {
    return this.options.editableText && node.range
      ? ` data-htsl-range="${node.range[0]}-${node.range[1]}"`
      : "";
  }

  /** ` data-htsl-component="name"` on a component instance root (preview edits the
   *  component's definition). */
  private componentAttr(node: ElementNode): string {
    return this.options.editableText && node.component
      ? ` data-htsl-component="${escapeHtml(node.component)}"`
      : "";
  }

  /** Render an `{@…}` object: declarative 3D scenes vs the math/geometry layer. */
  private object(node: ObjectNode): string {
    const hashAttr = this.options.hashBlocks ? ` data-htsl-hash="${htslHash(node)}"` : "";
    if (isSlidePath(node.path)) return this.slides(node, hashAttr);
    if (node.path === CALLOUT_REF_PATH) return this.calloutRef(node);
    if (isCalloutPath(node.path)) return this.callout(node);
    if (node.path === "reveal") return this.reveal(node);
    if (node.path === "tabs") return this.tabsBlock(node, hashAttr);
    if (node.path === "tabs.tab") return this.tabsTab(node);
    if (node.path === "quiz") return this.quiz(node, hashAttr);
    if (node.path === "flashcard") return this.flashcard(node);
    if (isThreePath(node.path)) return renderThree(node, hashAttr);
    if (isParamPath(node.path)) return renderParam(node);
    if (isPlotPath(node.path)) return renderPlot(node, hashAttr, paramValues(this.paramCtx));
    if (isChartPath(node.path)) return renderChart(node, hashAttr);
    if (isVariationsPath(node.path)) return renderVariations(node, this.options.katex, hashAttr);
    return renderMathObject(node, this.ctx, {
      ...(this.options.katex !== undefined ? { katex: this.options.katex } : {}),
      ...(this.options.source !== undefined ? { source: this.options.source } : {}),
      ...(this.options.hashBlocks ? { hash: htslHash(node) } : {}),
    });
  }

  /**
   * Slider object: the deck (`{@slider: {@slider.slide:…}}`) or a single slide.
   * Only `{@slider.slide:…}` children become slides (others are ignored). Emits a
   * declarative structure — the runtime wires up the navigation; no JS is produced.
   */
  private slides(node: ObjectNode, hashAttr: string): string {
    // A standalone `{@slider.slide:…}` just renders as a <section>.
    if (node.path === "slider.slide") return this.slideSection(node);

    const slides = node.children.filter(
      (c): c is ObjectNode => c.type === "object" && c.path === "slider.slide",
    );
    const stage = slides.map((s) => this.slideSection(s)).join("");
    const n = slides.length;
    return (
      `<div class="htsl-deck" data-htsl-slides data-htsl-index="0" tabindex="0"${hashAttr}>` +
      `<div class="htsl-deck-progress"><span class="htsl-deck-fill"></span></div>` +
      `<div class="htsl-deck-stage">${stage}</div>` +
      `<div class="htsl-deck-nav">` +
      `<button type="button" class="htsl-deck-btn htsl-deck-prev" aria-label="Slide précédent">&#8249;</button>` +
      `<span class="htsl-deck-counter">${n ? 1 : 0} / ${n}</span>` +
      `<button type="button" class="htsl-deck-btn htsl-deck-next" aria-label="Slide suivant">&#8250;</button>` +
      `<button type="button" class="htsl-deck-btn htsl-deck-full" aria-label="Plein écran">&#9974;</button>` +
      `</div>` +
      `</div>`
    );
  }

  /** Render one `{@slider.slide:…}` as a `<section>` (its children = slide body). */
  private slideSection(node: ObjectNode): string {
    const inner = node.children
      .filter((c) => c.type !== "comment")
      .map((c) => this.compact(c))
      .join("");
    return `<section>${inner}</section>`;
  }

  /**
   * Semantic callout ({@theorem}, {@definition}, {@proof}…). Numbered types carry
   * a per-type number (pre-computed) and an optional title; a labelled callout
   * gets an id so {@ref} can link to it. Pure HTML, no JS.
   */
  private callout(node: ObjectNode): string {
    const t = calloutType(node.path);
    const meta = this.calloutCtx.info.get(node);
    const tone = t?.tone ?? "remark";
    let head = t?.name ?? "";
    if (meta?.number !== undefined) head += ` ${meta.number}`;
    const title = node.attrs["title"];
    if (title) head += ` — ${escapeHtml(title)}`;
    const label = node.attrs["label"];
    const idAttr = label ? ` id="${calloutId(tone, label)}"` : "";
    const body = node.children
      .filter((c) => c.type !== "comment")
      .map((c) => this.compact(c))
      .join("");
    return (
      `<div class="htsl-callout htsl-callout-${tone}"${idAttr}>` +
      `<div class="htsl-callout-head">${head}</div>` +
      `<div class="htsl-callout-body">${body}</div>` +
      `</div>`
    );
  }

  /** Cross-reference to a numbered callout: {@ref[to=label]/} → "Théorème N". */
  private calloutRef(node: ObjectNode): string {
    const to = node.attrs["to"];
    const target = to ? this.calloutCtx.labels.get(to) : undefined;
    if (!target) return `<span class="htsl-ref htsl-ref-broken">(réf. ?)</span>`;
    return `<a class="htsl-ref" href="#${target.id}">${escapeHtml(target.name)}&nbsp;${target.number}</a>`;
  }

  /** Collapsible block (hidden solution): a native <details> — zero JS. */
  private reveal(node: ObjectNode): string {
    const title = escapeHtml(node.attrs["title"] ?? "Solution");
    const open = node.attrs["open"] === "true" ? " open" : "";
    const body = this.childrenHtml(node);
    return (
      `<details class="htsl-reveal"${open}>` +
      `<summary class="htsl-reveal-summary">${title}</summary>` +
      `<div class="htsl-reveal-body">${body}</div>` +
      `</details>`
    );
  }

  /** Tabbed content ({@tabs: {@tabs.tab[title=…]:…}}). The runtime wires the bar. */
  private tabsBlock(node: ObjectNode, hashAttr: string): string {
    const tabs = node.children.filter(
      (c): c is ObjectNode => c.type === "object" && c.path === "tabs.tab",
    );
    const bar = tabs
      .map(
        (t, i) =>
          `<button type="button" class="htsl-tab-btn" data-htsl-tab-to="${i}">${escapeHtml(
            t.attrs["title"] ?? `Onglet ${i + 1}`,
          )}</button>`,
      )
      .join("");
    const panels = tabs.map((t) => `<div class="htsl-tab-panel">${this.childrenHtml(t)}</div>`).join("");
    return (
      `<div class="htsl-tabs" data-htsl-tabs data-htsl-tab="0"${hashAttr}>` +
      `<div class="htsl-tabs-bar" role="tablist">${bar}</div>` +
      `<div class="htsl-tabs-panels">${panels}</div>` +
      `</div>`
    );
  }

  /** A standalone {@tabs.tab:…} (outside {@tabs:}) → just its content panel. */
  private tabsTab(node: ObjectNode): string {
    return `<div class="htsl-tab-panel">${this.childrenHtml(node)}</div>`;
  }

  /** Render an object's children (compact), dropping comments. */
  private childrenHtml(node: ObjectNode): string {
    return node.children
      .filter((c) => c.type !== "comment")
      .map((c) => this.compact(c))
      .join("");
  }

  /** Direct element children of `node` whose tag is `tag` (e.g. `q`, `opt`). */
  private els(node: ObjectNode, tag: string): ElementNode[] {
    return node.children.filter((c): c is ElementNode => c.type === "element" && c.tag === tag);
  }

  /** Render an element's own children (compact), dropping comments. */
  private elementBody(el: ElementNode): string {
    return el.children
      .filter((c) => c.type !== "comment")
      .map((c) => this.compact(c))
      .join("");
  }

  /**
   * Multiple-choice question ({@quiz: {q:…} {opt:…} {opt[correct=true]:…} {explain:…}}).
   * Options carry data-correct; the runtime grades on click. No JS from content.
   */
  private quiz(node: ObjectNode, hashAttr: string): string {
    const q = this.els(node, "q")[0];
    const explain = this.els(node, "explain")[0];
    const question = q ? this.elementBody(q) : "";
    const opts = this.els(node, "opt")
      .map((o) => {
        const correct = o.attrs["correct"] !== undefined && o.attrs["correct"] !== "false" ? "1" : "0";
        return `<button type="button" class="htsl-quiz-opt" data-correct="${correct}">${this.elementBody(o)}</button>`;
      })
      .join("");
    const explainHtml = explain
      ? `<div class="htsl-quiz-explain" hidden>${this.elementBody(explain)}</div>`
      : "";
    return (
      `<div class="htsl-quiz" data-htsl-quiz${hashAttr}>` +
      `<div class="htsl-quiz-q">${question}</div>` +
      `<div class="htsl-quiz-opts">${opts}</div>` +
      explainHtml +
      `</div>`
    );
  }

  /** Flip card ({@flashcard: {front:…} {back:…}}) — pure CSS (checkbox + label). */
  private flashcard(node: ObjectNode): string {
    const front = this.els(node, "front")[0];
    const back = this.els(node, "back")[0];
    const id = `htsl-fc-${this.flashcardCounter++}`;
    return (
      `<div class="htsl-flashcard">` +
      `<input type="checkbox" id="${id}" class="htsl-fc-toggle" />` +
      `<label class="htsl-fc-inner" for="${id}">` +
      `<span class="htsl-fc-face htsl-fc-front">${front ? this.elementBody(front) : ""}</span>` +
      `<span class="htsl-fc-face htsl-fc-back">${back ? this.elementBody(back) : ""}</span>` +
      `</label>` +
      `</div>`
    );
  }

  /* ----------------------------------------------------------------------- */
  /* Compact rendering                                                       */
  /* ----------------------------------------------------------------------- */

  /** Render a text run, wrapping it in an editable span when requested. */
  private textHtml(node: TextNode, value: string): string {
    const escaped = escapeHtml(value);
    if (this.options.editableText && node.range) {
      return `<span class="htsl-edit" data-htsl-text="${node.range[0]}-${node.range[1]}">${escaped}</span>`;
    }
    return escaped;
  }

  private compact(node: Node): string {
    switch (node.type) {
      case "text":
        return this.textHtml(node, node.value);
      case "comment":
        return "";
      case "error":
        return htmlComment(node.message);
      case "object":
        return this.object(node);
      case "element":
        return this.compactElement(node);
      case "define":
      case "set":
      case "var":
        return ""; // removed by expansion
    }
  }

  private compactElement(node: ElementNode, extra = ""): string {
    if (this.isBlocked(node.tag)) {
      return escapeHtml(rawHtml(node));
    }
    const data = extra + this.rangeAttr(node) + this.componentAttr(node);
    const open = openTag(node, data);
    if (VOID_TAGS.has(node.tag)) return open;
    if (RAW_TEXT_TAGS.has(node.tag)) return this.rawText(node, open, data);
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
        return pad + this.textHtml(node, node.value.trim());
      case "comment":
        return "";
      case "error":
        return pad + htmlComment(node.message);
      case "object":
        return pad + this.object(node);
      case "element":
        return this.prettyElement(node, indent);
      case "define":
      case "set":
      case "var":
        return ""; // removed by expansion
    }
  }

  private prettyElement(node: ElementNode, indent: number, extra = ""): string {
    const pad = "  ".repeat(indent);
    if (this.isBlocked(node.tag)) {
      return pad + escapeHtml(rawHtml(node));
    }
    const data = extra + this.rangeAttr(node) + this.componentAttr(node);
    const open = openTag(node, data);
    if (VOID_TAGS.has(node.tag)) return pad + open;
    if (RAW_TEXT_TAGS.has(node.tag)) return pad + this.rawText(node, open, data);

    const children = node.children.filter((c) => c.type !== "comment");
    if (children.length === 0) {
      return `${pad}${open}</${node.tag}>`;
    }
    // Inline a lone text child for compact, readable output.
    const only = children[0];
    if (children.length === 1 && only && only.type === "text") {
      return `${pad}${open}${this.textHtml(only, only.value.trim())}</${node.tag}>`;
    }
    const lines = [pad + open];
    for (const child of children) lines.push(this.pretty0(child, indent + 1));
    lines.push(`${pad}</${node.tag}>`);
    return lines.join("\n");
  }

  /**
   * Render a raw-text element's body. `{style:…}` is emitted verbatim (CSS).
   * For `{script:…}`: an external resource (`{script[src]/}`, empty body) is a
   * normal `<script>` (the author chose to load it), but an **inline** body is
   * emitted **inert** (`type="text/plain"`) — HTSL content never produces
   * executable JS (see SECURITY in the README).
   */
  private rawText(node: ElementNode, open: string, data: string): string {
    const body = rawTextOf(node);
    if (node.tag === "script" && body.trim() !== "") {
      return `<script type="text/plain"${data}>${neutralizeScript(body)}</script>`;
    }
    return `${open}${body}</${node.tag}>`;
  }

  private isBlocked(tag: string): boolean {
    return this.allowedTags !== null && !this.allowedTags.has(tag);
  }
}

/** Prevent an inline (inert) script body from closing its `<script>` tag. */
function neutralizeScript(body: string): string {
  return body.replace(/<\/(script)/gi, "<\\/$1");
}

/* -------------------------------------------------------------------------- */
/* Serialization helpers                                                      */
/* -------------------------------------------------------------------------- */

/** Concatenate a raw-text element's text children verbatim (script/style body). */
function rawTextOf(node: ElementNode): string {
  return node.children
    .filter((c): c is TextNode => c.type === "text")
    .map((c) => c.value)
    .join("");
}

function openTag(node: ElementNode, extra = ""): string {
  let s = `<${node.tag}${extra}`;
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
    case "object":
    case "define":
    case "set":
    case "var":
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

/** Render a recovered ErrorNode as a safe HTML comment. */
function htmlComment(message: string): string {
  const safe = message.replace(/--+/g, "-").replace(/[<>]/g, "");
  return `<!-- HTSL error: ${safe} -->`;
}
