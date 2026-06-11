import "./style.css";

import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching } from "@codemirror/language";
import { autocompletion, completionKeymap, closeBrackets } from "@codemirror/autocomplete";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";

import { parse, render, mathCss, HTSLError } from "htsl";
import type { Node } from "htsl";
import katex from "katex";

import { htslLanguage } from "./htsl-lang";
import { htslCompletions } from "./complete";
import { examples } from "./examples";
import { buildFrameDoc } from "./frame-doc";

/* -------------------------------------------------------------------------- */
/* DOM                                                                        */
/* -------------------------------------------------------------------------- */

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const editorEl = $("editor");
const renderFrame = $<HTMLIFrameElement>("render");
const astEl = $<HTMLPreElement>("ast");
const bannerEl = $<HTMLDivElement>("banner");
const panelsEl = $<HTMLElement>("panels");
const examplesSel = $<HTMLSelectElement>("examples");
const toggleAst = $<HTMLInputElement>("toggle-ast");

/* -------------------------------------------------------------------------- */
/* Shared state                                                               */
/* -------------------------------------------------------------------------- */

let latestHtml = "";
let diagnostics: Diagnostic[] = [];

function posFromLineCol(doc: EditorState["doc"], line: number, col: number): number {
  if (line < 1 || line > doc.lines) return 0;
  const l = doc.line(line);
  return Math.min(l.from + Math.max(0, col - 1), l.to);
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

function run(view: EditorView): void {
  const src = view.state.doc.toString();
  const errors: { line: number; col: number; message: string }[] = [];

  // Tolerant parse never throws.
  let ast: Node[] = [];
  try {
    ast = parse(src, { mode: "tolerant" });
  } catch (e) {
    // Defensive: should not happen in tolerant mode.
    errors.push({ line: 1, col: 1, message: String((e as Error).message) });
  }
  collectErrorNodes(ast, errors);

  // Render. Compile-time issues (unknown ref/var, missing param…) throw HTSLError.
  try {
    const html = render(ast, { katex, source: src });
    latestHtml = html;
    // Render in a sandboxed iframe: the user's {link}/{script} (any CSS/JS
    // framework) execute there, isolated from the playground UI.
    renderFrame.srcdoc = buildFrameDoc(html, mathCss);
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

  // Banner + diagnostics
  if (errors.length === 0) {
    bannerEl.hidden = true;
    bannerEl.textContent = "";
  } else {
    bannerEl.hidden = false;
    const first = errors[0]!;
    bannerEl.textContent =
      `${errors.length} erreur${errors.length > 1 ? "s" : ""} — ligne ${first.line}, col ${first.col} : ${first.message}`;
  }
  diagnostics = errors.map((err) => {
    const from = posFromLineCol(view.state.doc, err.line, err.col);
    return { from, to: Math.min(from + 1, view.state.doc.length), severity: "error", message: err.message } as Diagnostic;
  });
}

/* -------------------------------------------------------------------------- */
/* Editor                                                                     */
/* -------------------------------------------------------------------------- */

let debounce: number | undefined;
const updateListener = EditorView.updateListener.of((u) => {
  if (!u.docChanged) return;
  window.clearTimeout(debounce);
  debounce = window.setTimeout(() => run(view), 150);
});

const extensions: Extension[] = [
  lineNumbers(),
  highlightActiveLine(),
  history(),
  bracketMatching(),
  closeBrackets(),
  lintGutter(),
  linter(() => diagnostics, { delay: 120 }),
  keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
  htslLanguage(),
  autocompletion({ override: [htslCompletions()], activateOnTyping: true }),
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

function setDoc(src: string): void {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: src } });
  run(view);
}

function initialDoc(): string {
  const fromHash = decodeHash();
  if (fromHash) return fromHash;
  return examples[0]!.src;
}

function encodeHash(src: string): string {
  return "#s=" + btoa(encodeURIComponent(src));
}
function decodeHash(): string | null {
  const h = location.hash;
  const m = /^#s=(.*)$/.exec(h);
  if (!m) return null;
  try {
    return decodeURIComponent(atob(m[1]!));
  } catch {
    return null;
  }
}

// Examples menu
for (const ex of examples) {
  const opt = document.createElement("option");
  opt.value = ex.id;
  opt.textContent = ex.label;
  examplesSel.appendChild(opt);
}
examplesSel.addEventListener("change", () => {
  const ex = examples.find((e) => e.id === examplesSel.value);
  if (ex) {
    setDoc(ex.src);
    location.hash = "";
  }
});

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

$("btn-share").addEventListener("click", async () => {
  const url = location.origin + location.pathname + encodeHash(view.state.doc.toString());
  window.history.replaceState(null, "", url);
  await navigator.clipboard.writeText(url);
  flash($("btn-share"), "Lien copié ✓");
});

toggleAst.addEventListener("change", () => {
  panelsEl.classList.toggle("no-ast", !toggleAst.checked);
});

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
  if (!toggleAst.checked) return;
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

// Exposed for debugging / scripting from the console.
(window as unknown as { htslView: EditorView }).htslView = view;

run(view);
