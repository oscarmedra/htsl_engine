# 18 — Auto-évaluation : @quiz & @flashcard (lot 3 « pédagogie »)

## Besoin

L'auto-évaluation : un **QCM** avec correction instantanée, et des **cartes à
retourner** (mémorisation de définitions/formules).

## Objets

- **`{@quiz:}`** — `{q:…}` (énoncé), des `{opt:…}` (options ;
  `{opt[correct=true]:…}` = bonne réponse), `{explain:…}` (optionnel). Alias
  `qcm`. Au clic, feedback ✓/✗ + révélation + explication (runtime).
- **`{@flashcard:}`** — `{front:…}` / `{back:…}`. Alias `carte`. Retournement
  **100 % CSS** (checkbox masqué + label + `rotateY` 3D).

> Note : l'attribut booléen sans valeur (`[correct]`) n'est pas accepté par le
> parser → on utilise **`[correct=true]`** (présence d'un `correct` ≠ `"false"`).

## Implémentation (packages/core)

- **Registre** : `quiz` (alias `qcm`), `flashcard` (alias `carte`), catégorie
  `structure`. Les sous-éléments (`q`/`opt`/`explain`, `front`/`back`) sont de
  simples éléments du modèle `html` — pas d'entrées de registre.
- **Renderer** : helpers `els(node, tag)` (enfants éléments par tag) et
  `elementBody(el)`.
  - `quiz()` → `<div class="htsl-quiz" data-htsl-quiz>` avec un `.htsl-quiz-q`,
    des `<button class="htsl-quiz-opt" data-correct="0|1">` et un
    `.htsl-quiz-explain` (caché). Aucun JS dans le contenu.
  - `flashcard()` → `<input class="htsl-fc-toggle" id="htsl-fc-N">` + `<label
    class="htsl-fc-inner" for>` avec deux `.htsl-fc-face` (front/back). Id unique
    via un compteur du renderer (déterministe → morph-safe).
- **Runtime** (`quiz-client.ts`) : `hydrateQuiz` — un listener `click` par
  fenêtre ; `grade()` marque ✓/✗, révèle les `[correct]`, affiche l'explication,
  verrouille (`data-htsl-answered`, morph-safe). Flashcard = **aucun runtime**.
- **CSS** (`mathCss`) : options (hover, `is-correct`/`is-wrong` avec ✓/✗ en
  `::after`), encart d'explication ; carte 3D (`perspective`,
  `transform-style: preserve-3d`, `:checked + .inner { rotateY(180deg) }`,
  `backface-visibility: hidden`), indicateur ↻, et `@media print` (faces
  empilées, toutes visibles).

## Vérifié

- Tests cœur **247** (4 nouveaux : flags `data-correct`, `correct=false`, faces
  flashcard, ids uniques).
- Navigateur : clic mauvaise option → ✗ rouge + bonne révélée ✓ + explication +
  options verrouillées ; flashcard retournée → le **verso** est bien au-dessus
  (`elementFromPoint` = back, KaTeX du verso) ; 0 erreur console ; typecheck OK.

## Suite

Lot 4 : `@chart` (barres/camembert/histogramme). Lot 5 : `@variations` /
`@signs`. Lot 6 : paramètre interactif.
