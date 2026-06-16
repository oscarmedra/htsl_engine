/**
 * Documentation page logic. The object catalogue and the AI prompt are generated
 * from the engine's introspection registry, so they are always up to date.
 */
import "./docs.css";
import { registry, type RegistryEntry } from "@noah-medra/htsl-core";

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
/* AI prompt (instructions + generated object reference)                      */
/* -------------------------------------------------------------------------- */

function objectReference(): string {
  const objects = registry.list().filter((e) => e.kind === "object");
  return CATEGORIES.flatMap(([cat, label]) => {
    const group = objects.filter((e) => e.category === cat).sort((a, b) => a.path.localeCompare(b.path));
    if (group.length === 0) return [];
    const lines = group.map((e) => {
      const alias = e.aliases.length ? ` (alias: ${e.aliases.join(", ")})` : "";
      return `  - {@${e.path}}${alias} — ${e.description}\n    ex: ${e.example.replace(/\n/g, " ")}`;
    });
    return [`### ${label}`, ...lines, ""];
  }).join("\n");
}

function buildPrompt(): string {
  return `Tu es un assistant qui rédige des documents avec HTSL (HyperText Structured Language),
un langage de balisage léger qui compile en HTML, pensé pour les maths et la physique.
Réponds UNIQUEMENT avec du HTSL valide (pas de balises HTML brutes, pas de Markdown).

# Syntaxe
- Élément : {tag: contenu}. Classe : {tag.box: …}. Id : {tag#main: …}. Combinable : {div#a.b: …}.
- Attributs entre crochets, SÉPARÉS PAR DES VIRGULES, chaînes entre guillemets doubles :
  {a[href="/x", target="_blank"]: lien}. Nombres décimaux/négatifs autorisés (x=-2.5).
- Auto-fermant : {tag/} (ex. {img[src="a.png"]/}).
- Commentaire : {!-- ignoré --}. Échappements littéraux : \\{ \\} \\: \\$.
- Imbrication libre. Les balises HTML standard (h1..h6, p, ul/ol/li, table, a, strong, em, code, blockquote, div, img, hr…) s'écrivent comme des éléments.

# Mathématiques (KaTeX)
- En ligne : {@mti: a^2+b^2} ou $a^2+b^2$. Bloc centré : {@mtb: …} ou $$…$$.
- Équation numérotée : {@mte[label=euler]: e^{i\\pi}+1=0}. Référence croisée : {@mtr[to=euler]/}.
- Aligné/cas/système : {@mta: {line:…}}, {@mtc[intro="…"]: {case:…}}, {@mts: {line:…}}. Fraction : {@mof:{num:1}{den:2}}.

# Composants & variables
- Définition : {!define carte[titre, couleur=indigo]: {div:{h3:{$titre}}{$children}}}. Usage : {@carte[titre="X"]: contenu}.
- Variable : {!set v: 9.81} puis {$v}. Pour du LaTeX brut réutilisable, METTRE LA VALEUR ENTRE GUILLEMETS :
  {!set H: "\\tfrac{1}{2}\\big(p^2 + \\omega^2 q^2\\big)"} puis {@mtb: H = {$H}}.

# Visualisations (toutes déclaratives)
- Graphe 2D d'une fonction : {@plot[fn="sin(x)/x", xrange="(-15,15)", title="…"]/}.
  Plusieurs courbes : {@plot[xrange="(-6.28,6.28)"]: {@plot.curve[fn="sin(x)", label="sin"]/} {@plot.curve[fn="cos(x)", label="cos"]/}}.
- Géométrie 2D/3D (Plotly) : {@mg2.scene: {@mg2.frame[grid=true]/} {@mg2.circle[center="(0,0)", radius=2]/}} ; {@mg3.scene: {@mg3.space[grid=true]/} {@mg3.sphere[center="(0,0,0)", radius=2]/}}.
- Scène 3D animée (Three.js, collection s3) : conteneur {@s3.scene[height=440, controls=true, distance=9, autorotate=false, loop=true]: …}.
  Formes : s3.sphere/box/torus/cylinder/cone/plane/point. Aussi s3.vector (from→to), s3.line (points="(x,y,z);…"), s3.surface (z="f(x,y)"), s3.curve (x/y/z=f(t)), s3.label, s3.axes, s3.grid.
  Donne un id aux objets puis anime : {@s3.animate[target="A", action="move|rotate|scale|color|fade|transform", to="(2,2,0)"|"<id>", duration=2, easing="easeInOut"]/}. transform = vrai morph de forme + couleur (B est un gabarit, sa position est ignorée).
- Les expressions (sin(x)/x, cos(t), x*x+y*y…) acceptent + - * / % ^, fonctions (sin cos tan exp log sqrt abs min max …) et constantes (pi e tau phi).

# Mise en page / frameworks
- Le rendu est une iframe isolée : charge un framework depuis le document, ex.
  {script[src="https://cdn.tailwindcss.com"]/} ou {link[rel="stylesheet", href="…bootstrap…"]/}.
- Classes complexes via [class="…"] : {div[class="p-4 rounded-xl bg-white hover:shadow-md"]: …}.

# RÈGLE DE SÉCURITÉ IMPORTANTE
- Le contenu HTSL NE PEUT PAS exécuter de JavaScript : un {script: …code…} inline est rendu inerte.
  Pour de l'interactivité (animation, 3D, graphes), utilise UNIQUEMENT les objets déclaratifs ci-dessus.
  Seul {script[src="…"]/} (chargement d'un CDN) est autorisé.

# Catalogue complet des objets @
${objectReference()}
# Exemple de document complet
{h1:Oscillateur harmonique}
{!set H: "\\tfrac{1}{2}\\big(p^2 + \\omega^2 q^2\\big)"}
{@mte[label=ham]: H = {$H}}
{p:Le hamiltonien {@mtr[to=ham]/} conserve l'énergie. Voici son portrait de phase :}
{@plot[fn="sqrt(max(0, 1 - x*x))", xrange="(-1,1)", title="p(q)"]/}
`;
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
if (promptEl) promptEl.value = buildPrompt();

const copyPrompt = document.getElementById("copy-prompt");
copyPrompt?.addEventListener("click", async () => {
  if (!promptEl) return;
  await navigator.clipboard.writeText(promptEl.value);
  copyPrompt.textContent = "Copié ✓";
  setTimeout(() => (copyPrompt.textContent = "Copier"), 1200);
});

copyButtons(); // after the catalog injected its <pre> blocks
