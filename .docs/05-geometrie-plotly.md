# 05 — Géométrie via Plotly

## Objectif

Rendu graphique des objets géométriques, déclenché par un conteneur `scene`
(pas d'appel de fonction dans le texte).

## Règle de contexte

- Objet géométrique **dans** une scène → trace Plotly.
- Objet géométrique **hors** scène → sa notation LaTeX existante.
- Aucune régression LaTeX (la scène consomme ses enfants ; un objet isolé passe
  par `latexOfObject` → `latexOfGeometry`).

## Architecture

- `src/objects/geometry.ts` :
  - `toPlotly(node, dim)` → traces Plotly (JSON pur), une fonction par forme.
  - `sceneSpec(scene)` → `{ data, layout }` (assemble les traces + layout ;
    cadrage 2D calculé sur les objets finis pour ne pas être écrasé par une
    droite infinie ; `aspectmode:"data"` en 3D).
  - `latexOfGeometry(node)` → notation LaTeX hors-scène.
  - `isGeometryPath` / `isScenePath`.
- `src/objects/math.ts` : `renderMathObject` route les `*.scene` vers
  `renderScene` (un `<div class="htsl-scene" data-htsl-scene="…JSON…">` +
  message de repli) ; `latexOfObject` route la géométrie vers `latexOfGeometry`.
- `src/scene-client.ts` : `hydrateScenes(root?, Plotly?)` — lit `data-htsl-scene`
  et appelle `Plotly.newPlot` si Plotly est disponible (no-op sans DOM/Plotly).
- Le cœur **ne dépend jamais** de Plotly (peerDependency optionnelle, comme KaTeX).

## Collections (registre `@`)

- `mg2` → `math.geometry.2d`, `mg3` → `math.geometry.3d` (alias de collection).
- 2D : `scene`, `point`, `segment`, `circle`, `polygon`, `droite`.
- 3D : `scene`, `point`, `vector` (ligne + `cone`), `segment`, `line`, `plane`
  (`mesh3d`), `sphere` (`surface` paramétrique).

## Formes de traces

- point → `scatter`/`scatter3d` (markers + texte).
- segment/line/droite → `scatter`/`scatter3d` lignes (droite/line étendues).
- vector → `scatter3d` ligne + `cone` à la pointe.
- circle → `scatter` paramétrique fermé ; polygon → `scatter` `fill:"toself"`.
- plane → `mesh3d` (quad orienté par la normale) ; sphere → `surface` (grille).

Attributs visuels : `color`, `opacity`, `label`/`name`. Valeurs : tuples
`"(x,y,z)"`, scalaires (`d=5`, `opacity=0.5` — décimales non quotées gérées par
un lexème nombre dans l'en-tête).

## Tests (`tests/geometry.test.ts`, 16)

Structure des traces de chaque `toPlotly` (2D et 3D), assemblage de scène
(2D/3D layout), règle de contexte (scène → div ; hors-scène → LaTeX), repli sans
Plotly (JSON dans `data-htsl-scene` + message). Total : **128 tests** verts.

## Démo

`demo-geometry.htsl` (+ `npm run demo:geometry`) ; `examples/geometry.html`
(Plotly via CDN, scènes 2D et 3D). Rendu confirmé en navigateur. `teste.html`
intègre aussi deux scènes dans des cartes Tailwind.
