# 12 — Couche d'exécution déclarative + runtime unique

## Problème

Trois bugs structurels venaient de `<script>` impératifs dans le HTML rendu :

1. scripts exécutés **avant le chargement des CDN** (« Plotly is not defined ») ;
2. scripts **ré-exécutés** aux rerenders (« Identifier has already been declared ») ;
3. exécution **avant que le DOM soit prêt** (`getElementById` null).

Cause racine : le contenu HTSL (mon ajout `{script:…}` inline) produisait du JS
exécutable, et l'hydratation des scènes était éparpillée dans le playground avec
des rustines (injection `<script>` Plotly, `runInlineScripts`, flags/promesses).

## Architecture cible : 100 % déclaratif + runtime unique

### 1. Renderer déclaratif (packages/core)

Le renderer n'émet **aucun `<script>`** pour les éléments dynamiques. Chaque
scène est un nœud porteur de données :
`<div class="htsl-scene" data-htsl-scene='{traces+layout}' data-htsl-hash="…">`
(+ repli). Pattern générique : `class htsl-<type>` + `data-htsl-<type>`.

Sécurité : `{script: …code…}` **inline** est désormais **inerte**
(`<script type="text/plain">`, `</script>` neutralisé). Seul `{script[src=…]/}`
(CDN externe choisi par l'auteur) reste un vrai `<script>`. `{style:…}` reste du
CSS verbatim. Le contenu HTSL ne peut donc plus produire de JS exécutable.

### 2. Runtime unique (`packages/core/src/runtime.ts`)

- `loadDependency(url, win?)` : charge un script externe, **Promise mise en
  cache par (fenêtre, URL)** → jamais de double chargement ni de course.
- `hydrate(root, win?)` : scanne les `htsl-*`, charge la dépendance **seulement
  s'il y a du travail**, initialise, marque `data-htsl-init="<hash>"`.
  **Idempotent**. Hash changé → `Plotly.react` (jamais destroy + `newPlot`) ;
  inchangé → strictement rien.
- `purge(removed, win?)` : `Plotly.purge` des scènes retirées (anti-fuite).
- `installHtslRuntime(win?)` : unique global `window.HTSL`, hydrate au
  `DOMContentLoaded` + `MutationObserver` (mode page statique).

Le runtime tourne dans le realm appelant mais opère sur une fenêtre cible (la
page, ou l'iframe du playground) — pas d'injection cross-realm. Une seule
dépendance déclarée pour l'instant : Plotly (scènes) ; KaTeX viendra.

`scene-client.ts` reste le dessin bas niveau (`hydrateScenes`, `pendingScenes`,
`purgeScenes`) ; le runtime l'orchestre avec le chargement des dépendances.

### 3. Playground

`FrameRenderer` ne charge plus Plotly ni n'exécute de scripts : après chaque
morphing il collecte les scènes retirées (`onNodeDiscarded`), appelle
`purge(removed, iframeWindow)` puis `hydrate(root, iframeWindow)`. Les rustines
(`runInlineScripts`, `ranScripts`, `plotlyLoading`, injection `<script>`) sont
supprimées.

## Tests

- Core (`tests/runtime.test.ts`, faux DOM minimal) : cache de `loadDependency`
  (un seul chargement, même Promise), idempotence de `hydrate`, `react` au
  changement de hash, `purge` au retrait, pas de chargement quand rien à faire.
- `tests/raw-text.test.ts` adapté : script inline rendu inerte, `</script>`
  neutralisé, `{script[src]/}` externe conservé.
- Core **197**, codemirror **33**.

## Vérifié en navigateur

Document avec scène 3D → **10 modifications consécutives** (rayon variable) :
**0 erreur console**, **1 seul plot** (react en place, pas de fuite), **1 seul
script Plotly** (chargé une fois). Retrait de scène → `Plotly.purge` appelé.
`{script: code}` inline → non exécuté (inerte). Re-ajout de scène → redessine
sans erreur.
