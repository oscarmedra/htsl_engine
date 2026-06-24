/**
 * Inline block editor — a full HTSL CodeMirror instance that floats over a
 * clicked element in the preview, so the whole authoring experience (syntax
 * highlighting, autocompletion, linting) is available *directly from the render*.
 *
 * It is mounted in the parent document (where CodeMirror already works), then
 * positioned over the element using the iframe's offset. It reuses the exact
 * same extensions as the main editor via @noah-medra/htsl-codemirror.
 */
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, tooltips } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching } from "@codemirror/language";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
  startCompletion,
} from "@codemirror/autocomplete";
import { parse, registry } from "@noah-medra/htsl-core";
import { htslLanguage, htslCompletion, htslLinter } from "@noah-medra/htsl-codemirror";

export interface Rect {
  left: number;
  top: number;
  width: number;
}

export interface BlockEditOptions {
  /** Initial HTSL source of the block. */
  doc: string;
  /** Where to anchor the editor, in parent-viewport (fixed) coordinates. */
  rect: Rect;
  /** Called with the new source when the user commits. */
  onCommit: (text: string) => void;
  /** Called when the user cancels (Escape). */
  onCancel: () => void;
}

/** Open the floating editor. Returns a disposer that cancels it. */
export function openBlockEditor(opts: BlockEditOptions): () => void {
  let done = false;

  const wrap = document.createElement("div");
  wrap.className = "block-editor";
  wrap.style.left = `${Math.max(8, opts.rect.left)}px`;
  wrap.style.top = `${Math.max(8, opts.rect.top)}px`;
  wrap.style.width = `${Math.max(opts.rect.width, 360)}px`;

  const finish = (commit: boolean): void => {
    if (done) return;
    done = true;
    const text = view.state.doc.toString();
    view.destroy();
    wrap.remove();
    if (commit) opts.onCommit(text);
    else opts.onCancel();
  };

  // Commit / cancel. Placed *after* completionKeymap so that, when the
  // completion popup is open, Escape closes the popup instead of cancelling.
  const localKeys = keymap.of([
    { key: "Mod-Enter", run: () => (finish(true), true) },
    { key: "Ctrl-Enter", run: () => (finish(true), true) },
    { key: "Escape", run: () => (finish(false), true) },
  ]);

  const view = new EditorView({
    parent: wrap,
    state: EditorState.create({
      doc: opts.doc,
      extensions: [
        history(),
        bracketMatching(),
        closeBrackets(),
        htslLanguage(),
        htslLinter(parse),
        // Render popups in <body> so they escape the editor's overflow:hidden box.
        tooltips({ parent: document.body }),
        autocompletion({ override: [htslCompletion(registry)], activateOnTyping: true }),
        // Open the slash menu when "/" is typed alone at the start of a line
        // (parity with the main editor).
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return;
          const pos = u.state.selection.main.head;
          const line = u.state.doc.lineAt(pos);
          if (/^\s*\/$/.test(u.state.sliceDoc(line.from, pos))) {
            setTimeout(() => startCompletion(view), 0);
          }
        }),
        keymap.of([...closeBracketsKeymap, ...completionKeymap]),
        localKeys,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        // No auto-commit on blur: changes are applied only via the « Valider »
        // button (or ⌘/Ctrl+Entrée). Clicking elsewhere leaves the editor open.
        EditorView.theme({
          "&": { maxHeight: "340px" },
          ".cm-scroller": { overflow: "auto" },
        }),
      ],
    }),
  });

  // Footer: keyboard hint + explicit Cancel / Validate buttons. Changes are
  // applied only on « Valider » (or ⌘/Ctrl+Entrée), never automatically.
  const foot = document.createElement("div");
  foot.className = "block-editor-foot";

  const hint = document.createElement("span");
  hint.className = "block-editor-hint";
  hint.textContent = "⌘/Ctrl + Entrée · Échap";

  const actions = document.createElement("span");
  actions.className = "block-editor-actions";

  const mkBtn = (label: string, klass: string, commit: boolean): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `be-btn ${klass}`;
    b.textContent = label;
    // Keep the click from blurring/refocusing oddly before it registers.
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => finish(commit));
    return b;
  };
  actions.appendChild(mkBtn("Annuler", "be-cancel", false));
  actions.appendChild(mkBtn("Valider", "be-commit", true));

  foot.appendChild(hint);
  foot.appendChild(actions);
  wrap.appendChild(foot);

  document.body.appendChild(wrap);
  view.focus();

  // Exposed for debugging / scripting from the console (like the main editor).
  (window as unknown as { htslBlockView?: EditorView }).htslBlockView = view;

  return () => finish(false);
}
