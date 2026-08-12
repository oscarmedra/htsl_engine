# 25 — Encadré neutre `{@panel}` & étapes numérotées `{@stepper}`

Deux composants pour compléter les objets de base : l'un **sans** structure
imposée, l'autre **très** structuré.

## `{@panel}` — encadré neutre (alias `overview`, `box`, `panneau`)

Comme les encadrés sémantiques ({@theorem}…) mais **sans en-tête** : ni mot-clé,
ni numéro. Juste une boîte pour mettre en valeur un contenu.

```
{@panel[color=indigo, title="En bref"]: {p:Un contenu mis en valeur.}}
{@panel: {p:Boîte neutre, sans titre.}}
```

- `color` ∈ `slate` (défaut, neutre), `indigo`, `blue`, `green`, `red`, `amber`,
  `violet`, `teal` — inconnu → `slate`. Rendu : bordure gauche accentuée + fond
  teinté via des variables CSS (`--pc-accent` / `--pc-bg` / `--pc-border`).
- `title` optionnel, **affiché seulement s'il est fourni**.

## `{@stepper}` + `{@step}` — étapes numérotées (alias `etapes` / `etape`)

Conteneur parent qui **numérote automatiquement** ses `{@step}` enfants
(1, 2, 3…), rendu en **timeline** verticale : badge rond numéroté + trait de
liaison + titre optionnel + corps. Pour une méthode / procédure de résolution.

```
{@stepper:
  {@step[title="Poser le problème"]: {p:…}}
  {@step[title="Discriminant"]: {@mtb: \Delta = b^2 - 4ac}}
  {@step: {p:Conclure.}}   {!-- un step sans titre marche aussi --}
}
```

- La numérotation est **locale au stepper** (pas de compteur de document) :
  `stepper()` itère ses enfants `stepper.step` et les numérote 1..N.
- Un `{@step}` **hors** stepper rend une puce « • » (pas de numéro).
- Les enfants qui ne sont pas des `{@step}` sont ignorés pour la numérotation.

## Implémentation

- `renderer.ts` : dispatch `panel` / `stepper` / `stepper.step` ; méthodes
  `panel()`, `stepper()`, `step(node, n)` ; helper `panelColor()`.
- `objects/registry.ts` : 3 objets enregistrés (autocomplétion, snippets, doc).
- `objects/css.ts` : `.htsl-panel*` (variables de couleur) et `.htsl-stepper` /
  `.htsl-step*` (timeline).
- Aucun JS runtime : rendu pur (comme les encadrés).

## Vérifié

Tests `tests/panel-stepper.test.ts` (9) : panel neutre sans en-tête, couleur,
titre conditionnel, repli slate, aliases ; stepper numéroté 1..N, titres,
enfants ignorés, step isolé = puce, alias etapes/etape. Suite core : 328.
