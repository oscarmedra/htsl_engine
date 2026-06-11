# 09 — Optimisation de la réactivité du playground

## Problème

Chaque mise à jour faisait `iframe.srcdoc = …` : rechargement complet de
l'iframe → re-parse du document, rechargement de KaTeX, ré-exécution de Plotly,
scintillement. Le moteur, lui, est rapide. Stratégie : **recompilation complète
(rapide) + application chirurgicale au DOM**. Pas de parsing incrémental.

## 1. Garde de source (audit)

`run()` compare le source au précédent (`lastSrc`) **avant tout travail** : aucune
recompilation si le texte n'a pas changé. Les interactions sans changement de
source (clics de boutons, focus, sélection) ne déclenchent donc rien — le garde
CodeMirror `docChanged` + cette comparaison verrouillent ça.

## 2. Morphing DOM (idiomorph/morphdom)

Le panneau de rendu est une **iframe persistante** (créée une fois ;
`packages…/playground/src/frame.ts` → classe `FrameRenderer`). À chaque mise à
jour : **morphdom** applique uniquement les nœuds réellement modifiés.
Les `<link>`/`<script>` (frameworks) sont hissés et réconciliés par clé dans le
`<head>` (jamais rechargés s'ils n'ont pas changé) ; les `<script>` ajoutés sont
recréés pour s'exécuter.

## 3. Stabilité des blocs : `data-htsl-hash`

Option **renderer** `hashBlocks` (désactivée par défaut, activée par le
playground) : le renderer estampille `data-htsl-hash` = hash FNV-1a stable du
sous-arbre AST (`src/hash.ts`) sur chaque **nœud de premier niveau**, chaque
**bloc math** et chaque **scène**. Le morpher saute tout bloc au hash identique
(`onBeforeElUpdated → false`), sans comparaison interne. Tests : `tests/perf.test.ts`.

## 4. Cache KaTeX

Mémoïsation LaTeX→HTML dans `objects/math.ts` (`Map`, limite 500, éviction du
plus ancien). Une formule déjà rendue n'appelle plus jamais
`katex.renderToString`. Export `clearKatexCache()` (tests).

## 5. Préservation Plotly

`hydrateScenes` (scene-client) est préservatif : une scène dont la description
(hash) est inchangée garde son `<div>` (jamais de `newPlot`) ; si seules les
données changent → `Plotly.react`. Le morpher ne touche jamais le DOM interne
d'une scène (`htsl-scene` → skip + mise à jour de l'attribut seulement).

## Démonstration mesurable

En mode dev, le bandeau du panneau de rendu affiche le temps de mise à jour et le
nombre de nœuds DOM touchés (`MAJ 9 ms · 3/2410 nœuds touchés`). Exemple
« Performance (30 cartes + 2 scènes) » : **modifier un mot d'un paragraphe touche
3 nœuds sur ~2410, en ~10 ms, sans recréer ni re-plotter les scènes** (vérifié en
navigateur : nœuds de scène identiques, `data-htsl-plotted` inchangé).

## Garanties

Aucune modification de la syntaxe du langage. `hashBlocks` est opt-in. Tests
moteur : **167** (10 nouveaux). Le parsing reste complet à chaque frappe.
