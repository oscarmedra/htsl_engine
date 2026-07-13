/**
 * Contextual help as a **hover tooltip** (like a real editor): hover over an
 * object/element name (`{@plot`, `{img`…) and its description + attribute table
 * pop up, straight from `registry.describe()`. Replaces the fixed bottom panel.
 */
import { hoverTooltip, type Tooltip } from "@codemirror/view";
import { registry, type ObjectMeta } from "@noah-medra/htsl-core";

/** The object/element whose `{name` the given position sits on, with its range. */
function metaAt(doc: string, pos: number): { meta: ObjectMeta; from: number; to: number } | null {
  const brace = doc.lastIndexOf("{", pos);
  if (brace < 0) return null;
  let nameStart = brace + 1;
  if (doc[nameStart] === "@") nameStart += 1;
  const m = /^[A-Za-z0-9_.-]+/.exec(doc.slice(nameStart));
  if (!m) return null;
  const nameEnd = nameStart + m[0].length;
  if (pos < brace || pos > nameEnd) return null; // only while over the `{name` part
  const meta = registry.describe(m[0]);
  return meta ? { meta, from: brace, to: nameEnd } : null;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function docHtml(meta: ObjectMeta): string {
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
  return (
    `<div class="help-name">${head}</div>` +
    `<div class="help-desc">${esc(meta.description)}</div>` +
    (rows ? `<table>${rows}</table>` : "")
  );
}

/** CodeMirror extension: documentation tooltip on hover over a component name. */
export const htslHoverDoc = hoverTooltip((view, pos): Tooltip | null => {
  const found = metaAt(view.state.doc.toString(), pos);
  if (!found) return null;
  return {
    pos: found.from,
    end: found.to,
    above: true,
    create() {
      const dom = document.createElement("div");
      dom.className = "help cm-htsl-hover";
      dom.innerHTML = docHtml(found.meta);
      return { dom };
    },
  };
});
