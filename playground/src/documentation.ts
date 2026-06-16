/**
 * Documentation page logic. The object catalogue and the AI prompt are generated
 * from the engine's introspection registry, so they are always up to date.
 */
import "./docs.css";
import { registry, type RegistryEntry } from "@noah-medra/htsl-core";
// Curated AI prompt (kept verbatim in its own file to avoid escaping LaTeX
// backslashes / backticks; Vite inlines it as a string at build time).
import aiPrompt from "./ai-prompt.txt?raw";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* -------------------------------------------------------------------------- */
/* Object catalogue (grouped by category, generated from the registry)        */
/* -------------------------------------------------------------------------- */

const CATEGORIES: Array<[string, string]> = [
  ["structure", "Structure & texte"],
  ["formules", "Mathématiques"],
  ["document", "Document (numérotation, références)"],
  ["géométrie", "Géométrie & scènes (Plotly · Three.js)"],
];

function attrTable(path: string): string {
  const meta = registry.describe(path);
  const attrs = meta?.attrs ?? [];
  if (attrs.length === 0) return "";
  const rows = attrs
    .map((a) => {
      const req = a.required ? '<td class="req">requis</td>' : `<td>${a.default !== undefined ? `déf. <code>${esc(a.default)}</code>` : "—"}</td>`;
      return `<tr><td><code>${esc(a.name)}</code></td><td>${esc(a.type)}</td>${req}<td>${esc(a.description ?? "")}</td></tr>`;
    })
    .join("");
  return `<table class="attrs"><thead><tr><th>attribut</th><th>type</th><th>requis / défaut</th><th>description</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function objectCard(e: RegistryEntry): string {
  const alias = e.aliases.length ? ` <span class="alias">· ${e.aliases.map(esc).join(" · ")}</span>` : "";
  return (
    `<div class="obj">` +
    `<div class="name">{@${esc(e.path)}}${alias}</div>` +
    `<div class="desc">${esc(e.description)}</div>` +
    attrTable(e.path) +
    `<pre><code>${esc(e.example)}</code></pre>` +
    `</div>`
  );
}

function buildCatalog(): void {
  const root = document.getElementById("catalog");
  if (!root) return;
  const objects = registry.list().filter((e) => e.kind === "object");
  let html = "";
  for (const [cat, label] of CATEGORIES) {
    const group = objects.filter((e) => e.category === cat).sort((a, b) => a.path.localeCompare(b.path));
    if (group.length === 0) continue;
    html += `<div class="cat-title">${esc(label)} — ${group.length} objets</div>`;
    html += group.map(objectCard).join("");
  }
  root.innerHTML = html;
}

/* -------------------------------------------------------------------------- */
/* Copy buttons                                                               */
/* -------------------------------------------------------------------------- */

function copyButtons(): void {
  document.querySelectorAll("pre").forEach((pre) => {
    if (pre.querySelector(".copy-btn")) return;
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copier";
    btn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(pre.querySelector("code")?.textContent ?? "");
      btn.textContent = "Copié ✓";
      setTimeout(() => (btn.textContent = "Copier"), 1200);
    });
    pre.appendChild(btn);
  });
}

/* -------------------------------------------------------------------------- */

buildCatalog();

const promptEl = document.getElementById("ai-prompt") as HTMLTextAreaElement | null;
if (promptEl) promptEl.value = aiPrompt;

const copyPrompt = document.getElementById("copy-prompt");
copyPrompt?.addEventListener("click", async () => {
  if (!promptEl) return;
  await navigator.clipboard.writeText(promptEl.value);
  copyPrompt.textContent = "Copié ✓";
  setTimeout(() => (copyPrompt.textContent = "Copier"), 1200);
});

copyButtons(); // after the catalog injected its <pre> blocks
