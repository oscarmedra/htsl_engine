/**
 * Contextual help — shows, for the object under the cursor, its description and
 * attribute table, straight from `registry.describe()`.
 */
import type { EditorView } from "@codemirror/view";
import { registry, type ObjectMeta } from "htsl";

/** Nearest `{@path` opened before the cursor; reads the full path forward. */
function objectAtCursor(doc: string, pos: number): ObjectMeta | null {
  const before = doc.slice(0, pos);
  const open = before.lastIndexOf("{@");
  if (open < 0) return null;
  const m = /^[A-Za-z0-9_.-]+/.exec(doc.slice(open + 2));
  return m ? registry.describe(m[0]) : null;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function updateHelp(view: EditorView, el: HTMLElement): void {
  const pos = view.state.selection.main.head;
  const meta = objectAtCursor(view.state.doc.toString(), pos);
  if (!meta) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const rows = meta.attrs
    .map((a) => {
      const t =
        a.type +
        (a.required
          ? ' <span class="req">requis</span>'
          : a.default !== undefined
            ? ` = ${a.default}`
            : "");
      return `<tr><td class="k">${a.name}</td><td class="t">${t}</td><td>${esc(a.description)}</td></tr>`;
    })
    .join("");
  const head = meta.kind === "element" ? `{${meta.path}}` : `{@${meta.path}}`;
  el.hidden = false;
  el.innerHTML =
    `<div class="help-name">${head}</div>` +
    `<div class="help-desc">${esc(meta.description)}</div>` +
    (rows ? `<table>${rows}</table>` : "");
}
