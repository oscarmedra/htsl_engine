# 17 — Correction cachée & onglets (lot 2 « pédagogie »)

## Besoin

Le workflow **exercice corrigé** : cacher une solution derrière un bouton, et
organiser « Énoncé / Indice / Solution » en onglets.

## Objets

- **`{@reveal[title="Solution", open=false]: …}`** — bloc dépliable. Alias
  `solution`, `spoiler`. Rendu en **`<details>`/`<summary>` natif → zéro JS, zéro
  runtime**. Le `title` est le libellé ; `open=true` l'ouvre au chargement.
- **`{@tabs:}`** + **`{@tabs.tab[title="…"]: …}`** — onglets. La barre est
  **hydratée par le runtime** (clic) car N onglets variables ne se font pas
  proprement en CSS pur.

## Implémentation (packages/core)

- **Registre** (`registry.ts`) : `reveal` (alias `solution`/`spoiler`), `tabs`,
  `tabs.tab`, catégorie `structure`. Présents au catalogue + prompt IA (auto).
- **Renderer** (`renderer.ts`) :
  - `reveal()` → `<details class="htsl-reveal">` (pur HTML).
  - `tabsBlock()` → `<div class="htsl-tabs" data-htsl-tabs data-htsl-tab="0">` avec
    une `.htsl-tabs-bar` de `<button class="htsl-tab-btn" data-htsl-tab-to="i">` et
    des `.htsl-tab-panel`. Ne garde que les enfants `tabs.tab` (autres ignorés) ;
    un `tabs.tab` isolé rend juste son panneau. Helper `childrenHtml()`.
- **Runtime** (`tabs-client.ts`, branché dans `runtime.ts#hydrate`) :
  `hydrateTabs` installe **un** listener `click` par fenêtre (délégation) ; l'index
  actif vit dans `data-htsl-tab` (**morph-safe**) ; `applyState` bascule les
  classes `is-active` (bouton + panneau) + `aria-selected`. Pur DOM, aucune
  dépendance.
- **CSS** (`mathCss`) : style du `<summary>` (chevron ▸/▾), barre d'onglets
  (onglet actif souligné accent), **dégradation gracieuse** (sans runtime → 1er
  panneau visible) et `@media print` (tous les panneaux affichés, barre masquée).

## Vérifié

- Tests cœur **243** (4 nouveaux : reveal `<details>` + défauts, tabs structure,
  onglets sans titre / enfants ignorés).
- Navigateur : onglets « Énoncé / Indice / Solution » avec **bascule au clic**
  (panneau + bouton actif), KaTeX dans les panneaux, `<details>` natif
  ouvrable ; 0 erreur console ; typecheck OK.

## Suite

Lot 3 : `@quiz` (QCM + feedback) + `@flashcard`. Lot 4 : `@chart`. Lot 5 :
`@variations` + `@signs`. Lot 6 : paramètre interactif.
