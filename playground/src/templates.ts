/**
 * Template gallery — replaces the object-insertion palette. Shows the ready-made
 * documents from `examples.ts` as clickable cards, grouped by category; clicking
 * one loads it into the editor (a single, undoable edit). Inline object insertion
 * stays available via the "/" completion menu, so nothing is lost for power users.
 */
import type { EditorView } from "@codemirror/view";
import { examples, TEMPLATE_CATEGORIES, type Example } from "./examples";

const norm = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** A short, plain source excerpt (first meaningful lines) for the card preview. */
function sourcePreview(src: string): string {
  const line = src
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("{!--"))
    .join(" · ");
  return line.length > 100 ? line.slice(0, 100) + "…" : line;
}

export function setupTemplates(
  view: EditorView,
  onLoad: (src: string) => void,
): { toggle: () => void } {
  const root = document.getElementById("palette") as HTMLElement;
  const list = document.getElementById("palette-list") as HTMLElement;
  const search = document.getElementById("palette-search") as HTMLInputElement;
  const closeBtn = document.getElementById("palette-close") as HTMLElement;

  function card(ex: Example): HTMLElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pal-entry";
    b.dataset.search = norm(`${ex.label} ${ex.description ?? ""} ${ex.category ?? ""}`);
    b.innerHTML =
      `<div class="pal-name">${esc(ex.label)}</div>` +
      (ex.description ? `<div class="pal-tech">${esc(ex.description)}</div>` : "") +
      `<div class="pal-preview">${esc(sourcePreview(ex.src))}</div>`;
    b.addEventListener("click", () => {
      onLoad(ex.src);
      close();
      view.focus();
    });
    return b;
  }

  function build(): void {
    list.innerHTML = "";
    const cats: string[] = [...TEMPLATE_CATEGORIES];
    // Any example with an unlisted (or missing) category lands under "Autres".
    for (const ex of examples) {
      const c = ex.category ?? "Autres";
      if (!cats.includes(c)) cats.push(c);
    }
    for (const cat of cats) {
      const inCat = examples.filter((e) => (e.category ?? "Autres") === cat);
      if (!inCat.length) continue;
      const h = document.createElement("div");
      h.className = "pal-cat";
      h.textContent = cat;
      list.appendChild(h);
      inCat.forEach((e) => list.appendChild(card(e)));
    }
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
    // Hide a category header when all its cards are filtered out.
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
        empty.textContent = "Aucun modèle.";
        list.appendChild(empty);
      }
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }
  }

  function open(): void {
    build();
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
