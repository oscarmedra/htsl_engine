# 20 — Tableaux de variations & de signes (lot 5 « pédagogie »)

## Besoin

Le **tableau de variations** (et le **tableau de signes**) — central au
lycée/prépa, et qu'aucun outil web ne fait vraiment bien. Différenciateur fort.

## Objets

- **`{@variations[var, fn]: {pt[x, y]/} {up|down/} … }`** : points (abscisse +
  valeur) séparés par des flèches. Les positions verticales (haut = max, bas =
  min) sont **déduites des flèches** (pas saisies).
- **`{@signs[var, fn]: {pt[x]/} {pt[x, zero=true]/} {s: +|-} … }`** : points
  (avec `zero=true` pour une racine) séparés par des signes.

Valeurs en LaTeX (`\infty`, fractions…). `var`/`fn` = en-têtes de lignes.

## Implémentation (packages/core)

- **`objects/variations.ts`** : `isVariationsPath` (matche `variations` et
  `signs`), `renderVariations` (+ `renderSigns`). `collect()` lit les enfants
  éléments dans l'ordre (`pt`, `up`/`down`, `s`). Position du point i déduite :
  `i=0` → bas si flèche[0]=up sinon haut ; `i>0` → haut si flèche[i-1]=up sinon
  bas. Rendu = **grille CSS** à 2 lignes (ligne `x` + ligne `f`), `2n` colonnes
  (label + n points + n-1 séparateurs). Les valeurs sont rendues en **KaTeX**
  via `inlineMath` (exporté de `math.ts`). Le `-` des signes devient `−`.
- **Renderer** : `if (isVariationsPath(node.path)) return renderVariations(node,
  this.options.katex, hashAttr);`. Registre : `variations` + `signs` (cat.
  `formules`). `pt`/`up`/`down`/`s` = simples éléments.
- **CSS** (`mathCss`) : `.htsl-vt` (grille bordée), ligne 1 grisée (en-tête x),
  cellules `htsl-vt-val` hautes avec alignement `top`/`bottom`, flèches ↗/↘
  accentuées, signes centrés.
- Pas de runtime, pas de dépendance (rendu pur).

> Note : attribut booléen sans valeur non supporté → `zero=true`.

## Vérifié

- Tests cœur **257** (4 nouveaux : paths, flèches ↘↗, positions déduites
  top/bottom, signes + 0 à la racine).
- Navigateur : tableau de variations de `x²-2x` (+∞ haut ↘ -1 bas ↗ +∞ haut) et
  tableau de signes de `2x-2` (− 0 +), 13 KaTeX dans les tableaux ; 0 erreur
  console ; typecheck OK.

## Suite

Lot 6 (dernier) : paramètre interactif (le « moment Desmos »).
