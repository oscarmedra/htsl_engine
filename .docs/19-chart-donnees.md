# 19 — Graphiques de données : @chart (lot 4 « pédagogie »)

## Besoin

Tracer de vraies **données** (stats) : barres, camembert, ligne, histogramme —
au-delà des graphes de fonctions (`@plot`).

## Objet

`{@chart[type="bar|pie|line|histogram", title, xtitle, ytitle]: …}` (alias
`graphique`). Données :
- **bar / pie / line** : un `{pt[x="…", y=…]/}` par valeur (`color` optionnel).
- **histogram** : valeurs brutes via `values="a,b,c,…"` (+ `bins=N`), sans `{pt}`.

## Implémentation

- **`objects/chart.ts`** : `isChartPath` + `renderChart`. Comme `@plot`, **réutilise
  la voie Plotly déclarative** : construit une figure `{ data, layout }` et émet un
  nœud `<div class="htsl-scene" data-htsl-scene="…json…">` — dessiné par la
  hydratation de scène existante (`hydrateScenes`). Bar = une couleur par
  catégorie ; pie = `labels`+`values` (textinfo label+percent) ; line = scatter
  lines+markers ; histogram = `type:histogram` (+ `nbinsx`). `coord()` garde un
  x numérique numérique (catégories restent en chaîne).
- **Renderer** : `if (isChartPath(node.path)) return renderChart(node, hashAttr);`
  (juste après `@plot`). Registre : objet `chart` (cat. `géométrie`, modèle
  `html`), `pt` = simple élément.
- Aucun nouveau runtime, aucune dépendance : Plotly est déjà chargé pour les
  scènes.

## Vérifié

- Tests cœur **253** (6 nouveaux : path, nœud de scène, bar/pie/histogram/line,
  défaut bar). *(Note : un bug initial du test — `spec(src)` au lieu de
  `spec(compile(src))` — corrigé en compilant dans le helper.)*
- Navigateur : barres colorées + camembert (avec %) + histogramme dessinés par
  Plotly (chargé du CDN), 3 scènes hydratées ; 0 erreur console ; typecheck OK.

## Suite

Lot 5 : `@variations` (tableau de variations) + `@signs`. Lot 6 : paramètre
interactif.
