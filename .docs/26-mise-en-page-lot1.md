# 26 — Mise en page & touches (lot 1 des composants suggérés)

Premier lot de la série « autres composants utiles ». Tous en **rendu pur**
(aucun JS runtime), réutilisant l'infra objet existante.

## Composants

- **`{@columns: {@col:…} {@col:…}}`** (alias `colonnes` / `col`, `colonne`) :
  grille de colonnes égales (`--htsl-cols` = nombre de `{@col}`), **empilées**
  sous 640 px. Pour « énoncé | solution », avant/après, comparaisons.
- **`{@deflist: {term:…} {def:…} …}`** (alias `glossaire`, `definitions`) :
  paires terme/définition → `<dl><dt>…</dt><dd>…</dd></dl>` (grille 2 colonnes).
- **`{@timeline: {@event[date="…"]:…} …}`** (alias `chronologie` ; enfant
  `event` / `evenement`) : frise verticale (trait + pastille + date + contenu).
- **`{@mark: …}`** (alias `surligne`, `highlight`) : `<mark>` surligné (inline).
- **`{@badge[color=…]: …}`** (alias `pill`, `tag`, `etiquette`) : pastille inline
  colorée, **partageant la palette de `{@panel}`** (variables `--pc-*` mutualisées).

## Implémentation

`renderer.ts` : dispatch + `columns()`, `deflist()`, `timeline()`,
`timelineEvent()`, `badge()` (+ mark/col inline) ; `objects/registry.ts` :
7 objets ; `objects/css.ts` : `.htsl-columns` (grid responsive), `.htsl-deflist`,
`.htsl-timeline`/`.htsl-tl-*`, `.htsl-mark`, `.htsl-badge` + palette partagée
`.htsl-panel--X, .htsl-badge--X`.

## Vérifié

Tests `tests/layout-lot1.test.ts` (8) : colonnes + compteur + alias, deflist
dt/dd ordonnés, timeline date/pastille + enfants ignorés, mark, badge couleur +
repli slate + alias. Suite core : 336.

## Suite

Lot 2 (pédagogie) : `@exercise` + solution, `@checklist`, stepper guidé,
`@numberline`. Lot 3 (scientifique) : chimie `\ce{}`, `@code`, `@qty`, table de vérité.
