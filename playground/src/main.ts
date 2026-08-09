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
import { setupTemplates } from "./templates";
import { htslHoverDoc } from "./help";

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
const toggleStacked = $<HTMLInputElement>("toggle-stacked");
const perfEl = document.getElementById("perf");
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

/**
 * A component was clicked in the preview: reveal its source in the main editor —
 * make sure the editor is visible, select the component's `{@…}` range and
 * scroll to it, then focus. Editing then happens directly in the main editor.
 */
function onBlockClick(start: number, end: number): void {
  if (!toggleEditor.checked) {
    toggleEditor.checked = true;
    saveFlag("editor", true);
    relayout();
  }
  view.focus();
  view.dispatch({
    selection: { anchor: start, head: end },
    scrollIntoView: true,
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

  // Only (re)render when the source is error-free. On ANY parse error (a stray
  // backslash, an unclosed block, a half-typed tag…) the tolerant parser still
  // produces a degraded AST that would render as a blank/broken block — so we
  // skip it, keep the last good render, and just surface the error in the banner.
  // The preview updates again as soon as the source is valid.
  if (errors.length === 0) {
    try {
      // hashBlocks lets the frame morpher skip unchanged blocks; editableText
      // makes source-backed text runs editable directly in the preview.
      const html = render(ast, { katex, source: src, hashBlocks: true, editableText: true, sanitize: true });
      latestHtml = html;
      const stats = frame.apply(html);
      showPerf(performance.now() - t0, stats.touched, stats.total);
    } catch (e) {
      // Compile-time issue (unknown ref/var, missing param…) → keep last good render.
      if (e instanceof HTSLError) {
        errors.push({ line: e.line, col: e.col, message: e.message.split("\n")[0] ?? e.message });
      } else {
        errors.push({ line: 1, col: 1, message: String((e as Error).message) });
      }
    }
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
      `${errors.length} erreur${errors.length > 1 ? "s" : ""} — ligne ${first.line}, col ${first.col} : ${first.message} · le rendu affiche la dernière version valide.`;
  }
}

/* -------------------------------------------------------------------------- */
/* Editor                                                                     */
/* -------------------------------------------------------------------------- */

let renderQueued = false;
let saveTimer: number | undefined;
const updateListener = EditorView.updateListener.of((u) => {
  if (!u.docChanged) return;
  // Live preview: coalesce to at most one render per animation frame so the
  // rendered text tracks the keystrokes in real time (compile+render is ~3 ms,
  // well under a frame) without re-rendering several times within one frame.
  if (!renderQueued) {
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      run(view);
    });
  }
  // Auto-save is throttled separately — a localStorage write on every frame is
  // wasteful, and losing the last few hundred ms on a hard refresh is harmless.
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveLocal(view.state.doc.toString()), 400);
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
  htslHoverDoc,
  EditorView.updateListener.of((u) => {
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
  panelsEl.classList.toggle("stacked", toggleStacked.checked);
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
toggleStacked.addEventListener("change", () => {
  saveFlag("stacked", toggleStacked.checked);
  relayout();
});

/** Restore the persisted panel visibility (defaults: editor + AST hidden). */
function restorePanelPrefs(): void {
  toggleEditor.checked = loadFlag("editor") ?? false;
  toggleAst.checked = loadFlag("ast") ?? false;
  toggleStacked.checked = loadFlag("stacked") ?? false;
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
let stackRender = 0.58; // render height fraction in stacked layout

function applyColumns(): void {
  // Custom drag widths only apply when every panel is visible.
  if (!toggleAst.checked || !toggleEditor.checked) return;
  panelsEl.style.gridTemplateColumns = `${editorW}fr 6px ${renderW}fr 6px ${Math.max(0.15, 1 - editorW - renderW)}fr`;
}

function applyStackHeight(): void {
  panelsEl.style.setProperty("--stack-render", `${(stackRender * 100).toFixed(1)}%`);
}

document.querySelectorAll<HTMLElement>(".gutter").forEach((gutter) => {
  gutter.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const which = gutter.dataset.gutter;

    // Stacked layout: gutter 1 becomes a vertical (row) resize of the render height.
    if (panelsEl.classList.contains("stacked")) {
      if (which !== "1") return;
      const startY = e.clientY;
      const total = panelsEl.clientHeight;
      const start = stackRender;
      const onMove = (ev: MouseEvent): void => {
        stackRender = Math.min(0.85, Math.max(0.15, start + (ev.clientY - startY) / total));
        applyStackHeight();
      };
      const onUp = (): void => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      return;
    }

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

// Template gallery (📄 Modèles button). Loading a template replaces the document
// in a single, undoable edit (Ctrl/Cmd+Z restores the previous content).
const templates = setupTemplates(view, (src) => {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: src } });
  view.focus();
  run(view, true);
});
$("btn-insert").addEventListener("click", () => templates.toggle());

// Exposed for debugging / scripting from the console.
(window as unknown as { htslView: EditorView }).htslView = view;

// Restore the panel visibility chosen on a previous visit (default: both hidden).
restorePanelPrefs();
relayout();

// Styles + layout are applied now — reveal the app (hidden until here to avoid
// the flash of unstyled content on load/refresh).
$("app").style.visibility = "visible";

run(view);

// Restore a compressed shared link (#z=…) once the editor is ready.
void hydrateFromHash();

// Drop the render loader only once the first render is fully hydrated (scenes
// drawn) — so a refresh shows a clean loader, never half-rendered content. A
// safety timeout guarantees it never sticks (e.g. a CDN is unreachable).
const hideLoader = (): void => renderLoader?.classList.add("is-ready");
void frame.firstRender.then(hideLoader);
window.setTimeout(hideLoader, 8000);
