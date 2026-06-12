/**
 * Insertion palette — generated entirely from the engine's introspection
 * registry (`registry.list()`). No element list is hard-coded here.
 *
 * Entries are grouped by category, searchable, each shows a rendered preview
 * compiled by the engine from its metadata example (computed once, cached).
 * Clicking inserts the entry's hole-snippet at the cursor and refocuses the
 * editor. Slash command (typing `/`) uses the same data via @htsl/codemirror.
 */
import "katex/dist/katex.min.css";
import { snippet, type Completion } from "@codemirror/autocomplete";
import type { EditorView } from "@codemirror/view";
import { registry, compile, mathCss, type Category, type RegistryEntry } from "htsl";
import katex from "katex";

const CATEGORY_ORDER: { id: Category; label: string }[] = [
  { id: "structure", label: "Structure" },
  { id: "formules", label: "Formules" },
  { id: "géométrie", label: "Géométrie" },
  { id: "document", label: "Document" },
];

const norm = (s: string): string =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const previewCache = new Map<string, string>();
function preview(entry: RegistryEntry): string {
  const hit = previewCache.get(entry.path);
  if (hit !== undefined) return hit;
  let html: string;
  try {
    const compiled = compile(entry.example, { katex });
    html = compiled.includes("htsl-scene")
      ? '<em style="color:#6b7280">🧊 scène interactive (Plotly)</em>'
      : compiled;
  } catch {
    html = "";
  }
  previewCache.set(entry.path, html);
  return html;
}

export function setupPalette(view: EditorView): { toggle: () => void } {
  // Math styles for previews live in the parent document.
  const style = document.createElement("style");
  style.textContent = mathCss;
  document.head.appendChild(style);

  const root = document.getElementById("palette") as HTMLElement;
  const list = document.getElementById("palette-list") as HTMLElement;
  const search = document.getElementById("palette-search") as HTMLInputElement;
  const closeBtn = document.getElementById("palette-close") as HTMLButtonElement;

  const entries = registry.list();

  function insert(template: string): void {
    const { from, to } = view.state.selection.main;
    snippet(template)(view, { label: "" } as Completion, from, to);
    close();
    requestAnimationFrame(() => view.focus());
  }

  function build(): void {
    list.innerHTML = "";
    for (const { id, label } of CATEGORY_ORDER) {
      const group = entries.filter((e) => e.category === id);
      if (group.length === 0) continue;
      const cat = document.createElement("div");
      cat.className = "pal-cat";
      cat.textContent = label;
      cat.dataset.cat = id;
      list.appendChild(cat);
      for (const e of group) {
        const btn = document.createElement("button");
        btn.className = "pal-entry";
        btn.dataset.search = norm(e.path + " " + e.aliases.join(" ") + " " + e.description);
        const alias = e.aliases[0] ? `<span class="pal-alias">${e.aliases[0]}</span>` : "";
        btn.innerHTML =
          `<div class="pal-name">${e.path}${alias}</div>` +
          `<div class="pal-desc">${escapeText(e.description)}</div>` +
          `<div class="pal-preview">${preview(e)}</div>`;
        btn.addEventListener("click", () => insert(e.snippet));
        list.appendChild(btn);
      }
    }
  }

  function filter(q: string): void {
    const needle = norm(q.trim());
    let anyVisible = false;
    list.querySelectorAll<HTMLElement>(".pal-entry").forEach((el) => {
      const match = needle === "" || (el.dataset.search ?? "").includes(needle);
      el.hidden = !match;
      if (match) anyVisible = true;
    });
    // Hide category headers with no visible entries.
    list.querySelectorAll<HTMLElement>(".pal-cat").forEach((cat) => {
      let n: Element | null = cat.nextElementSibling;
      let visible = false;
      while (n && n.classList.contains("pal-entry")) {
        if (!(n as HTMLElement).hidden) visible = true;
        n = n.nextElementSibling;
      }
      cat.hidden = !visible;
    });
    let empty = list.querySelector(".pal-empty") as HTMLElement | null;
    if (!anyVisible) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "pal-empty";
        empty.textContent = "Aucun résultat.";
        list.appendChild(empty);
      }
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }
  }

  function open(): void {
    root.hidden = false;
    search.value = "";
    filter("");
    requestAnimationFrame(() => search.focus());
  }
  function close(): void {
    root.hidden = true;
  }
  function toggle(): void {
    if (root.hidden) open();
    else close();
  }

  build();
  search.addEventListener("input", () => filter(search.value));
  closeBtn.addEventListener("click", close);
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
      view.focus();
    }
  });

  return { toggle };
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
