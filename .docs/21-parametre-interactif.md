# 21 — Paramètre interactif : @param (lot 6 « pédagogie », le « moment Desmos »)

## Besoin

Un **curseur** qui pilote un graphe **en direct** : `{@param}` déclare un
paramètre, et un `{@plot}` dont la `fn` l'utilise se met à jour quand on bouge le
curseur. Tout en gardant « zéro JS depuis le contenu ».

## Comment ça reste déclaratif

`{@param}` rend un `<input type="range">` (déclaratif). Le **runtime** du moteur
(couche JS de confiance, pas du contenu) écoute le curseur, ré-évalue la fonction
avec l'**interpréteur d'expressions sûr** (`compileExpr`, jamais `eval`) et met à
jour Plotly (`restyle`). Même principe que Plotly/Three : interactivité par le
runtime, pas par un `<script>`.

## Syntaxe

```htsl
{@param[name="a", min=-3, max=3, step=0.1, value=1]/}
{@param[name="b", min=0.5, max=4, step=0.1, value=1]/}
{@plot[fn="a*sin(b*x)", xrange="(-6.28,6.28)"]/}
```

## Implémentation (packages/core)

- **`objects/param.ts`** : `isParamPath`, `buildParamContext` (pré-walk → noms +
  défauts), `paramValues` (scope pour l'échantillonnage), `renderParam` (le
  curseur `<input type=range>` + le libellé « nom = valeur »).
- **`plot.ts`** : `renderPlot(node, hashAttr, params)` échantillonne avec
  `{ x, ...params }` (valeurs par défaut). Si une **courbe unique** utilise un
  paramètre déclaré, le nœud porte aussi `data-htsl-fn` / `data-htsl-xrange` /
  `data-htsl-samples` / `data-htsl-params` pour le ré-échantillonnage runtime.
- **Renderer** : `this.paramCtx = buildParamContext(nodes)` ; dispatch
  `{@param}` → `renderParam`, et `renderPlot(..., paramValues(this.paramCtx))`.
- **Runtime** (`param-client.ts`) : `hydrateParams` installe un listener `input`
  (1×/fenêtre), maintient `window.__htslParams`, et sur mouvement d'un curseur :
  met à jour le libellé puis, pour chaque plot dépendant, recompile la fn,
  ré-échantillonne et appelle `Plotly.restyle`. `PlotlyLike` gagne `restyle?`.
- **CSS** (`mathCss`) : `.htsl-param` (curseur stylé, valeur en accent).

## Vérifié

- Tests cœur **262** (5 nouveaux : path, curseur, plot interactif marqué,
  échantillonnage à la valeur par défaut, plot simple non marqué).
- Navigateur : `y = a·sin(b·x)` avec 2 curseurs ; bouger `a` (1→3) multiplie le
  graphe par ~3 **en direct** ; curseurs indépendants (registre `{a,b}`) ; 0
  erreur console ; typecheck OK.

## Limite connue (v1)

Une **ré-édition** du document re-rend le HTML et **réinitialise les curseurs**
à leur valeur déclarée (morphdom). Pendant une exploration/présentation (sans
édition), tout est stable.

## Bilan

Feuille de route pédagogique **bouclée** (lots 1–6) : encadrés, reveal/tabs,
quiz/flashcard, chart, variations/signes, et le paramètre interactif.
