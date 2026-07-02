import "./style.css";

import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, codeFolding, foldGutter, foldKeymap } from "@codemirror/language";
import { autocompletion, completionKeymap, closeBrackets, startCompletion } from "@codemirror/autocomplete";
import { lintGutter } from "@codemirror/lint";

import { parse, render, registry, mathCss, HTSLError } from "@noah-medra/htsl-core";
import type { Node } from "@noah-medra/htsl-core";
import katex from "katex";

// Editor behaviour comes entirely from the reusable @noah-medra/htsl-codemirror package.
import { htslLanguage, htslCompletion, htslLinter } from "@noah-medra/htsl-codemirror";

import { examples } from "./examples";
import {
  saveLocal,
  loadLocal,
  saveFlag,
  loadFlag,
  buildShareUrl,
  decodeLegacyHash,
  hasCompressedHash,
  decodeCompressedHash,
} from "./persistence";
import { FrameRenderer } from "./frame";
import { setupPalette } from "./palette";
import { updateHelp } from "./help";
import { openBlockEditor } from "./block-editor";

/* -------------------------------------------------------------------------- */
/* DOM                                                                        */
/* -------------------------------------------------------------------------- */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const editorEl = $("editor");
const renderFrame = $<HTMLIFrameElement>("render");
const astEl = $<HTMLPreElement>("ast");
const bannerEl = $<HTMLDivElement>("banner");
const panelsEl = $<HTMLElement>("panels");
const toggleAst = $<HTMLInputElement>("toggle-ast");
const toggleEditor = $<HTMLInputElement>("toggle-editor");
const perfEl = document.getElementById("perf");
const helpEl = $<HTMLDivElement>("help");
const renderLoader = document.getElementById("render-loader");

/* -------------------------------------------------------------------------- */
/* Shared state                                                               */
/* -------------------------------------------------------------------------- */

let latestHtml = "";
let lastSrc: string | null = null;

/** Write a text edit made in the rendered preview back into the source. */
function onTextEdit(start: number, end: number, text: string): void {
  const escaped = text.replace(/([{}:$])/g, "\\$1"); // re-escape HTSL specials
  if (view.state.sliceDoc(start, end) === escaped) return; // unchanged
  view.dispatch({ changes: { from: start, to: end, insert: escaped } });
  run(view, true); // re-render immediately so offsets stay fresh
}

/** Write a whole-element edit (raw HTSL) from the preview back into the source. */
function onElementEdit(start: number, end: number, rawSource: string): void {
  if (view.state.sliceDoc(start, end) === rawSource) return; // unchanged
  view.dispatch({ changes: { from: start, to: end, insert: rawSource } });
  run(view, true);
}

/** Only one floating block editor at a time. */
let closeBlockEditor: (() => void) | null = null;

/**
 * A block was clicked in the preview: open a full HTSL editor (highlighting +
 * autocompletion) floating over it, so authoring happens straight from the
 * render. `rect` is in the iframe's own viewport; add the iframe offset.
 */
function onBlockClick(start: number, end: number, rect: DOMRect): void {
  closeBlockEditor?.(); // commit/cancel any previous one
  const frameRect = renderFrame.getBoundingClientRect();
  closeBlockEditor = openBlockEditor({
    doc: view.state.sliceDoc(start, end),
    rect: {
      left: frameRect.left + rect.left,
      top: frameRect.top + rect.top,
      width: rect.width,
    },
    onCommit: (text) => {
      closeBlockEditor = null;
      onElementEdit(start, end, text);
    },
    onCancel: () => {
      closeBlockEditor = null;
    },
  });
}

const frame = new FrameRenderer(renderFrame, mathCss, onTextEdit, onBlockClick);

/** Dev-only metric: update time + how few DOM nodes were actually touched. */
function showPerf(ms: number, touched: number, total: number): void {
  if (!perfEl || !import.meta.env.DEV) return;
  perfEl.textContent = `MAJ ${ms.toFixed(1)} ms · ${touched}/${total} nœuds touchés`;
}

function collectErrorNodes(nodes: Node[], out: { line: number; col: number; message: string }[]): void {
  for (const n of nodes) {
    if (n.type === "error") out.push({ line: n.loc.line, col: n.loc.col, message: n.message });
    if (n.type === "element" || n.type === "object") collectErrorNodes(n.children, out);
    else if (n.type === "define") collectErrorNodes(n.body, out);
    else if (n.type === "set") collectErrorNodes(n.value, out);
  }
}

/* -------------------------------------------------------------------------- */
/* Render pipeline                                                            */
/* -------------------------------------------------------------------------- */

function run(view: EditorView, force = false): void {
  const src = view.state.doc.toString();
  // Guard: never recompile unless the source text actually changed.
  if (!force && src === lastSrc) return;
  lastSrc = src;

  const t0 = performance.now();
  const errors: { line: number; col: number; message: string }[] = [];

  // Tolerant parse never throws. `ranges` lets edited text map back to source.
  let ast: Node[] = [];
  try {
    ast = parse(src, { mode: "tolerant", ranges: true });
  } catch (e) {
    // Defensive: should not happen in tolerant mode.
    errors.push({ line: 1, col: 1, message: String((e as Error).message) });
  }
  collectErrorNodes(ast, errors);

  // Render. Compile-time issues (unknown ref/var, missing param…) throw HTSLError.
  try {
    // hashBlocks lets the frame morpher skip unchanged blocks; editableText
    // makes source-backed text runs editable directly in the preview.
    const html = render(ast, { katex, source: src, hashBlocks: true, editableText: true, sanitize: true });
    latestHtml = html;
    const stats = frame.apply(html);
    showPerf(performance.now() - t0, stats.touched, stats.total);
  } catch (e) {
    if (e instanceof HTSLError) {
      errors.push({ line: e.line, col: e.col, message: e.message.split("\n")[0] ?? e.message });
    } else {
      errors.push({ line: 1, col: 1, message: String((e as Error).message) });
    }
    // Keep the last good render so the page never goes blank.
  }

  // AST panel
  astEl.textContent = JSON.stringify(ast, null, 2);

  // Banner summary (the underlines are handled by htslLinter).
  if (errors.length === 0) {
    bannerEl.hidden = true;
    bannerEl.textContent = "";
  } else {
    bannerEl.hidden = false;
    const first = errors[0]!;
    bannerEl.textContent =
      `${errors.length} erreur${errors.length > 1 ? "s" : ""} — ligne ${first.line}, col ${first.col} : ${first.message}`;
  }
}

/* -------------------------------------------------------------------------- */
/* Editor                                                                     */
/* -------------------------------------------------------------------------- */

let debounce: number | undefined;
const updateListener = EditorView.updateListener.of((u) => {
  if (!u.docChanged) return;
  window.clearTimeout(debounce);
  debounce = window.setTimeout(() => {
    run(view);
    saveLocal(view.state.doc.toString()); // auto-save: refresh never loses work
  }, 150);
  // Editing supersedes a shared link → drop the hash so a refresh uses the
  // local copy (the Share button regenerates a fresh link on demand).
  if (location.hash) window.history.replaceState(null, "", location.pathname + location.search);
});

const extensions: Extension[] = [
  lineNumbers(),
  highlightActiveLine(),
  history(),
  bracketMatching(),
  closeBrackets(),
  lintGutter(),
  codeFolding(),
  foldGutter(),
  keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap, ...foldKeymap, indentWithTab]),
  htslLanguage(),
  htslLinter(parse),
  autocompletion({ override: [htslCompletion(registry)], activateOnTyping: true }),
  EditorView.updateListener.of((u) => {
    if (u.selectionSet || u.docChanged) updateHelp(view, helpEl);
    // Auto-open the completion menu while typing a trigger. Recent versions of
    // @codemirror/autocomplete no longer auto-activate on non-word triggers like
    // "{@", so we start it explicitly (same mechanism as the slash command).
    // Only on real typing — never on programmatic edits (shared-link restore,
    // edits written back from the rendered preview…).
    if (u.docChanged && u.transactions.some((t) => t.isUserEvent("input"))) {
      const pos = u.state.selection.main.head;
      const line = u.state.doc.lineAt(pos);
      const lineBefore = u.state.sliceDoc(line.from, pos);
      const before = u.state.sliceDoc(Math.max(0, pos - 60), pos);
      const atTrigger =
        /^\s*\/[\w.-]*$/.test(lineBefore) || // /slash command (line start)
        /\{@[\w.-]*$/.test(before) || //        {@ object / component
        /\{\$[\w-]*$/.test(before) || //        {$ variable
        /\{![a-zA-Z]*$/.test(before) || //      {! directive
        /\[[\w-]*$/.test(before); //            [ attribute (the source gates it)
      if (atTrigger) setTimeout(() => startCompletion(view), 0); // defer: avoid dispatch-in-update
    }
  }),
  updateListener,
  EditorView.theme({ "&": { height: "100%" }, ".cm-scroller": { overflow: "auto" } }),
];

const view = new EditorView({
  parent: editorEl,
  state: EditorState.create({ doc: initialDoc(), extensions }),
});

/* -------------------------------------------------------------------------- */
/* Toolbar                                                                     */
/* -------------------------------------------------------------------------- */

function initialDoc(): string {
  // Priority: a shared link, then the auto-saved local copy, then the example.
  const legacy = decodeLegacyHash(location.hash);
  if (legacy !== null) return legacy;
  if (hasCompressedHash(location.hash)) return ""; // filled async (see hydrateFromHash)
  return loadLocal() ?? examples[0]!.src;
}

/** Replace the whole document (used when restoring a compressed shared link). */
function applyDoc(src: string): void {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: src } });
  run(view);
}

/** A compressed `#z=` link is decoded asynchronously after the editor exists. */
async function hydrateFromHash(): Promise<void> {
  const src = await decodeCompressedHash(location.hash);
  if (src !== null) applyDoc(src);
}


$("btn-copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText(latestHtml);
  flash($("btn-copy"), "Copié ✓");
});

$("btn-download").addEventListener("click", () => {
  const blob = new Blob([view.state.doc.toString()], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "document.htsl";
  a.click();
  URL.revokeObjectURL(a.href);
});

// Export the rendered preview as PDF via the browser's print dialog.
$("btn-pdf").addEventListener("click", () => frame.printToPdf());

$("btn-share").addEventListener("click", async () => {
  const url = await buildShareUrl(view.state.doc.toString());
  await navigator.clipboard.writeText(url);
  flash($("btn-share"), "Lien copié ✓");
});

/** Show/hide the AST and editor panels. Class-based columns govern; any custom
 *  drag widths are reset so the layout stays consistent across combinations. */
function relayout(): void {
  panelsEl.classList.toggle("no-ast", !toggleAst.checked);
  panelsEl.classList.toggle("no-editor", !toggleEditor.checked);
  panelsEl.style.gridTemplateColumns = ""; // let the CSS classes govern
}
// Persist each panel's visibility so a refresh keeps the layout you chose.
toggleAst.addEventListener("change", () => {
  saveFlag("ast", toggleAst.checked);
  relayout();
});
toggleEditor.addEventListener("change", () => {
  saveFlag("editor", toggleEditor.checked);
  relayout();
});

/** Restore the persisted panel visibility (defaults: editor + AST hidden). */
function restorePanelPrefs(): void {
  toggleEditor.checked = loadFlag("editor") ?? false;
  toggleAst.checked = loadFlag("ast") ?? false;
}

function flash(btn: HTMLElement, text: string): void {
  const old = btn.textContent;
  btn.textContent = text;
  window.setTimeout(() => (btn.textContent = old), 1200);
}

/* -------------------------------------------------------------------------- */
/* Resizable panels                                                           */
/* -------------------------------------------------------------------------- */

let editorW = 0.4;
let renderW = 0.36;

function applyColumns(): void {
  // Custom drag widths only apply when every panel is visible.
  if (!toggleAst.checked || !toggleEditor.checked) return;
  panelsEl.style.gridTemplateColumns = `${editorW}fr 6px ${renderW}fr 6px ${Math.max(0.15, 1 - editorW - renderW)}fr`;
}

document.querySelectorAll<HTMLElement>(".gutter").forEach((gutter) => {
  gutter.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const which = gutter.dataset.gutter;
    const startX = e.clientX;
    const total = panelsEl.clientWidth;
    const startEditor = editorW;
    const startRender = renderW;
    const onMove = (ev: MouseEvent): void => {
      const d = (ev.clientX - startX) / total;
      if (which === "1") {
        editorW = Math.max(0.15, startEditor + d);
      } else {
        renderW = Math.max(0.15, startRender + d);
      }
      applyColumns();
    };
    const onUp = (): void => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
});

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

// Insertion palette (➕ button or slash command in the editor).
const palette = setupPalette(view);
$("btn-insert").addEventListener("click", () => palette.toggle());

// Exposed for debugging / scripting from the console.
(window as unknown as { htslView: EditorView }).htslView = view;

// Restore the panel visibility chosen on a previous visit (default: both hidden).
restorePanelPrefs();
relayout();

run(view);
updateHelp(view, helpEl);

// Restore a compressed shared link (#z=…) once the editor is ready.
void hydrateFromHash();

// Drop the render loader only once the first render is fully hydrated (scenes
// drawn) — so a refresh shows a clean loader, never half-rendered content. A
// safety timeout guarantees it never sticks (e.g. a CDN is unreachable).
const hideLoader = (): void => renderLoader?.classList.add("is-ready");
void frame.firstRender.then(hideLoader);
window.setTimeout(hideLoader, 8000);
