# 28 — Scientifique (lot 3 des composants suggérés)

Troisième et dernier lot de la série. Tout en rendu pur, sauf la coloration de
code (opt-in via highlight.js chargé par le document).

## Composants

- **Chimie `{@ce: …}`** (alias `chimie`) : contenu pris en **LaTeX brut**
  (contentModel math) → `\ce{…}` rendu inline (extension **mhchem** de KaTeX).
  Le playground charge `katex/contrib/mhchem` (`main.ts`) ; un consommateur npm/CDN
  charge mhchem lui-même. `{@ce: 2 H2 + O2 -> 2 H2O}`.
- **`{@qty[value, unit]/}`** (alias `grandeur`) : grandeur physique → math inline
  `value\,\mathrm{unit}` (espace fine + unité droite). L'unité est du LaTeX.
- **`{@truthtable: {head:…} {row:…}}`** (alias `verite`) : `<table>` stylée ;
  cellules `V`/`1`/`vrai` colorées vert, `F`/`0`/`faux` rouge (`htsl-tt-true/false`).
- **`{@codeblock[lang=…]: … }`** (alias `listing`, `source`) : bloc de code
  **verbatim**. Nouveau **content model `"raw"`** : le lexer lit le contenu tel
  quel (les `{ }` `\` n'ont pas à être échappés), comme `{script}`/`{style}` mais
  pour un objet. Rendu `<pre class="htsl-code"><code class="language-…">` —
  **compatible highlight.js** (charge-le via `{link}`+`{script[src]}` pour colorer).

## Détails techniques

- `ContentModel` gagne `"raw"` (registry). Le lexer pousse une frame `raw` quand
  `contentModelOf(path) === "raw"` (miroir du test `"math"`), donc les alias
  marchent aussi. Le parser voit un simple nœud texte → transparent.
- Pourquoi `{@codeblock}` et non `{@code}` : `{code:…}` (inline) est déjà un
  élément ; réutiliser « code » créerait une collision de chemin dans le registre.
- `ce`/`qty` sont des cases de `latexOfObject` (`objects/math.ts`).

## Vérifié

Tests `tests/science-lot3.test.ts` (7) : `\ce{}` (via latexOfObject, non échappé),
`qty` `\,\mathrm{}`, table V/F colorée, codeblock verbatim (accolades intactes) +
indentation conservée + alias. mhchem : `\ce{2 H2 + O2 -> 2 H2O}` rendu par KaTeX.
Suite core : 349, codemirror 37.

## Série terminée

Lot 1 (mise en page), Lot 2 (pédagogie), Lot 3 (scientifique) : les 3 lots des
composants suggérés sont livrés.
