/**
 * Insertion palette — generated entirely from the engine's introspection
 * (`registry.list()` for built-in objects/elements, `registry.components()` for
 * the components the user has defined in the current document). No element list
 * is hard-coded here.
 *
 * Design (driven by user feedback):
 *  - The palette is the *primary* surface (the raw editor is for power users), so
 *    the friendly description leads and the technical path is secondary.
 *  - Entries are grouped, with **containers first**: the user's own components
 *    and the 2D/3D scenes — the things you fill with content.
 *  - Previews are **plain text** (the compiled example's text content, math shown
 *    as its LaTeX source), which is lighter and clearer than rendered formulas.
 *  - Inserting a container drops in **buffer content** that shows up in the
 *    render immediately, so nothing is ever an empty shell.
 */
import { snippet, type Completion } from "@codemirror/autocomplete";
import type { EditorView } from "@codemirror/view";
import { registry, compile, parse, type RegistryEntry } from "@htsl/core";

/** A flat, render-ready palette item (built from registry or document). */
interface Item {
  name: string; // friendly, leading line
  tech: string; // technical reference (path / component name), muted
  preview: string; // plain-text preview
  snippet: string; // hole-snippet inserted at the cursor
  search: string; // normalized haystack
}

const norm = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const isScene = (e: RegistryEntry): boolean => /\.scene$/.test(e.path);

/** Plain-text preview: compile the example (no KaTeX → LaTeX stays as text). */
const previewCache = new Map<string, string>();
function textPreview(example: string): string {
  const hit = previewCache.get(example);
  if (hit !== undefined) return hit;
  let text = "";
  try {
    const html = compile(example);
    if (html.includes("htsl-scene")) {
      text = "🧊 Graphique interactif";
    } else {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      text = (tmp.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text.length > 90) text = text.slice(0, 90) + "…";
    }
  } catch {
    text = "";
  }
  previewCache.set(example, text);
  return text;
}

function entryItem(e: RegistryEntry): Item {
  const alias = e.aliases[0] ? ` · ${e.aliases[0]}` : "";
  return {
    name: e.description || e.path,
    tech: e.path + alias,
    preview: textPreview(e.example),
    snippet: e.snippet,
    search: norm(e.path + " " + e.aliases.join(" ") + " " + e.description),
  };
}

/** Snippet for a user-defined component, pre-filled with buffer content. */
function componentSnippet(c: { name: string; params: { name: string; default: string | null }[] }): string {
  const params = c.params
    // Use the param name as a non-empty placeholder value when there is no
    // default, so the inserted component is valid HTSL and renders immediately
    // (an empty `name=` is a malformed attribute).
    .map((p, i) => p.name + "=${" + (i + 1) + ":" + (p.default ?? p.name) + "}")
    .join(", ");
  const head = params ? `{@${c.name}[${params}]` : `{@${c.name}`;
  return head + ": ${" + (c.params.length + 1) + ":Contenu du conteneur.}}";
}

function componentItem(c: { name: string; params: { name: string; default: string | null }[] }): Item {
  const ps = c.params.map((p) => p.name).join(", ");
  return {
    name: `Conteneur « ${c.name} »`,
    tech: ps ? `${c.name} · ${ps}` : c.name,
    preview: "Composant que vous avez défini — rempli d'un contenu tampon.",
    snippet: componentSnippet(c),
    search: norm(`${c.name} ${ps} composant conteneur réutilisable`),
  };
}

export function setupPalette(view: EditorView): { toggle: () => void } {
  const root = document.getElementById("palette") as HTMLElement;
  const list = document.getElementById("palette-list") as HTMLElement;
  const search = document.getElementById("palette-search") as HTMLInputElement;
  const closeBtn = document.getElementById("palette-close") as HTMLButtonElement;

  const entries = registry.list();
  const byCat = (cat: string): RegistryEntry[] => entries.filter((e) => e.category === cat && !isScene(e));
  const scenes = entries.filter(isScene);

  function insert(template: string): void {
    const { from, to } = view.state.selection.main;
    snippet(template)(view, { label: "" } as Completion, from, to);
    close();
    requestAnimationFrame(() => view.focus());
  }

  function section(label: string, items: Item[], emptyHint?: string): void {
    if (items.length === 0 && !emptyHint) return;
    const cat = document.createElement("div");
    cat.className = "pal-cat";
    cat.textContent = label;
    list.appendChild(cat);
    if (items.length === 0 && emptyHint) {
      const hint = document.createElement("div");
      hint.className = "pal-hint";
      hint.textContent = emptyHint;
      list.appendChild(hint);
      return;
    }
    for (const it of items) {
      const btn = document.createElement("button");
      btn.className = "pal-entry";
      btn.dataset.search = it.search;
      btn.innerHTML =
        `<div class="pal-name">${esc(it.name)}</div>` +
        `<div class="pal-tech">${esc(it.tech)}</div>` +
        (it.preview ? `<div class="pal-preview">${esc(it.preview)}</div>` : "");
      btn.addEventListener("click", () => insert(it.snippet));
      list.appendChild(btn);
    }
  }

  /** Rebuild the whole list. Containers come first; components are re-read from
   *  the current document each time (they change as the user defines them). */
  function build(): void {
    list.innerHTML = "";
    let components: Item[] = [];
    try {
      components = registry.components(parse(view.state.doc.toString(), { mode: "tolerant" })).map(componentItem);
    } catch {
      components = [];
    }
    // Clear classification so each kind of thing has an obvious home.
    section("Objets créés", components, "Définissez un composant avec {!define …} pour le retrouver ici.");
    section("Textes", byCat("structure").map(entryItem));
    section("Formules", [...byCat("formules"), ...byCat("document")].map(entryItem));
    section("Scènes", scenes.map(entryItem));
    section("Géométrie", byCat("géométrie").map(entryItem));
  }

  function filter(q: string): void {
    const needle = norm(q.trim());
    const searching = needle !== "";
    let anyVisible = false;
    list.querySelectorAll<HTMLElement>(".pal-entry").forEach((el) => {
      const match = !searching || (el.dataset.search ?? "").includes(needle);
      el.hidden = !match;
      if (match) anyVisible = true;
    });
    // Empty-state hints only show when not searching.
    list.querySelectorAll<HTMLElement>(".pal-hint").forEach((h) => (h.hidden = searching));
    list.querySelectorAll<HTMLElement>(".pal-cat").forEach((cat) => {
      let n: Element | null = cat.nextElementSibling;
      let visible = false;
      while (n && (n.classList.contains("pal-entry") || n.classList.contains("pal-hint"))) {
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
    build(); // refresh document-defined components
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

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
