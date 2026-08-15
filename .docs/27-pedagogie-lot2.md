# 27 — Pédagogie (lot 2 des composants suggérés)

Deuxième lot. Tout en **rendu pur** (0 JS de contenu ; les interactions reposent
sur du HTML natif — `<details>`, `<input type=checkbox>`).

## Composants

- **`{@exercise[title="…"]: … {solution:…}}`** (alias `exercice`) : exercice
  **numéroté par document** (« Exercice N », compteur `exerciseCounter` incrémenté
  à l'ordre de rendu). L'enfant `{solution:…}` (optionnel) est sorti du corps et
  rendu comme un `<details>` repliable « Solution ».
- **`{@checklist: {item:…}}`** (alias `todo`, `cases`) : `<ul>` de cases à cocher
  **natives**. `{item[checked=true]:…}` = pré-cochée. Cochables sans JS.
- **`{@stepper[guided=true]: …}`** : chaque `{@step}` devient un `<details>`
  **replié** (barre cliquable « Étape N »), pour révéler la solution pas à pas —
  toujours sans JS (native `<details>`).
- **`{@numberline[from,to,ticks]: {point[x,name,color]/} {segment[from,to,open,color]/}}`**
  (alias `droite`) : **droite graduée en SVG** (axe fléché + graduations + labels).
  `point` = pastille pleine (+ nom) ; `segment`/`interval` = trait épais avec
  bornes **pleines (fermées)** ou **creuses (ouvertes)** selon `open`
  (`none|left|right|both`). Helpers `numAttr()` / `endpoint()`.

## Implémentation

`renderer.ts` : dispatch + `exercise()`, `checklist()`, `numberline()` ; `step()`
gagne un paramètre `guided` (rendu `<details>`). `objects/registry.ts` : 3 objets
+ attribut `guided` sur stepper. `objects/css.ts` : `.htsl-exo*`, `.htsl-checklist`,
`details.htsl-step--guided`, `.htsl-numberline`.

## Vérifié

Tests `tests/pedagogy-lot2.test.ts` (8) : numérotation d'exercices + solution
repliable non dupliquée, checklist cochée/non, stepper guidé = `<details>`,
numberline SVG (point + segment, borne ouverte creuse). Suite core : 343.

## Suite

Lot 3 (scientifique) : chimie `\ce{}` (mhchem), `{@code}` coloré, `{@qty}` (unités),
table de vérité.
