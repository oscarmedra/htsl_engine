# Historique des actions — htsl_motor

Journal continu de l'ensemble des actions réalisées sur le projet.
Les entrées les plus récentes sont ajoutées en bas.

---

## 2026-06-10

- Initialisation du dépôt git (`git init`) à la racine du projet.
- Renommage de la branche par défaut `master` → `main`.
- Premier commit (`Initial commit`, `2d66a5f`) incluant `.groupedtimelineinclude` et les specs (`.specs/brd.md`, `.specs/prd.md`, `.specs/requirements.md`).
- Création du dossier `.docs/` avec `README.md` et `00-initialisation.md`.
- Création du dossier `.history/` avec ce fichier `history.md`.
- Mise en place de la convention permanente : tenir à jour `.docs/` et `.history/` tout au long du développement.

### Développement du moteur HTSL v0.1

- Configuration du projet : `package.json` (scripts build/test/demo/typecheck), `tsconfig.json` (mode strict + options strictes), `tsup.config.ts` (ESM, plateforme neutre), `.gitignore`.
- `src/types.ts` : types des tokens et de l'AST (union discriminée `Node` : `ElementNode`, `TextNode`, `CommentNode`, `ErrorNode`) + types d'options.
- `src/errors.ts` : `HTSLError` avec message localisé (ligne/col) et extrait du source avec curseur `^`.
- `src/lexer.ts` : lexer à modes (content/header), suivi ligne/colonne, échappements, gestion stricte/tolérante.
- `src/parser.ts` : parser descendant récursif suivant la grammaire formelle ; modes strict (throw) et tolerant (nœud `error`) ; détection des erreurs du §5 ; suppression des nœuds texte blancs.
- `src/renderer.ts` : rendu AST→HTML avec échappement XSS par défaut, balises void, `prettyPrint`, `allowedTags`.
- `src/index.ts` : API publique `parse()`, `render()`, `compile()` + exports de types.
- Tests Vitest : `tests/lexer.test.ts`, `tests/parser.test.ts`, `tests/renderer.test.ts` (55 tests).
- 6 golden files dans `tests/fixtures/` (`.htsl` → `.html`), générés via `scripts/gen-fixtures.ts`.
- `demo.htsl` + `scripts/demo.ts` (script `npm run demo`).
- `README.md` complet (présentation, syntaxe, grammaire, API, sécurité, erreurs, tests).
- Ajout de `@types/node` en devDependency pour le typecheck des tests/scripts.
- Vérification finale : `npm run typecheck` OK, `npm run build` OK, `npm test` 55/55 verts, `npm run demo` OK.

### Build minifié (test sur projet externe)

- Ajout de `tsup.min.config.ts` et du script `npm run build:min` produisant dans `dist-min/` :
  - `htsl.min.js` — ESM minifié (~9.6 Ko) pour `import` dans un projet avec bundler.
  - `htsl.global.js` — IIFE minifié (~10 Ko) exposant un global `HTSL` pour usage via `<script>`.
- Vérification des deux bundles : ESM (`compile`/`parse` + échappement XSS) et IIFE (global `HTSL` exposant `parse/render/compile/tokenize/HTSLError`).
- Ajout de `examples/browser.html` : page de démonstration navigateur (édition en direct) chargeant le bundle global.
- `dist-min/` ajouté au `.gitignore` (artefact de build, régénérable via `npm run build:min`).

### Objet moteur nommé `htsl_engine`

- Ajout dans `src/index.ts` d'un objet moteur `htsl_engine` (`{ parse, render, compile, tokenize, HTSLError }`), exporté en nommé **et** en défaut, pour un usage `htsl_engine.compile(...)`.
- Bundle global renommé : `globalName: "htsl_engine"` + footer exposant `globalThis.htsl_engine` et l'alias majuscule `globalThis.HTSL_ENGINE` (même objet moteur, sans `default`).
- Vérifié : global navigateur `htsl_engine.compile` / `HTML_ENGINE.compile`, et ESM `import htsl_engine`, `import { htsl_engine }`, fonctions nommées.
- `examples/browser.html` et `README.md` mis à jour pour `htsl_engine`.
- Alias global renommé `HTML_ENGINE` → `HTSL_ENGINE` (majuscule de `htsl_engine`), même objet.

### Conversion inverse HTML → HTSL

- `src/from-html.ts` : mini-parser HTML maison (zéro dépendance) → AST, puis sérialiseur AST → HTSL.
- Nouvelles fonctions exposées (API + objet `htsl_engine`) : `parseHtml`, `toHtsl`, `fromHtml`.
- Gère éléments, attributs (quotés/non quotés/booléens), balises void, commentaires, doctype ignoré, entités HTML ; tolérant (ne lève jamais), auto-fermeture des balises ouvertes.
- `tests/from-html.test.ts` : 19 tests (conversion, AST, options, round-trip HTML→HTSL→HTML). Total : **74 tests** verts.
- Bug corrigé : boucle infinie sur un `<` littéral isolé dans `readText` (détecté par le test de robustesse).
- Bundles régénérés (`npm run build` + `npm run build:min`) : `fromHtml` disponible en ESM et via les globals navigateur.
- README et `.docs/02-conversion-html-vers-htsl.md` ajoutés/mis à jour.

### Collection math.text.* + fondation des objets {@...}

- Fondation : syntaxe objet `{@chemin[attrs]:...}` / `{@.../}`, nouveau nœud AST `ObjectNode`.
- `src/objects/registry.ts` : registre + alias (plats `mti…mof` et de collection `mt`/`mc`/`mo`), modèles de contenu (math/html/void).
- Lexer réécrit avec une pile de contextes (content/header/math) ; le mode math lit du LaTeX brut + objets imbriqués `{@...}` ; raccourcis `$...$`/`$$...$$` unifiés vers les mêmes jetons que `{@mti}`/`{@mtb}` ; échappement `\$`.
- Parser : parsing des objets, contenu math (conserve les espaces) vs html ; erreurs « objet jamais fermé », profondeur, etc.
- `src/objects/math.ts` : génération LaTeX (résolution récursive des objets imbriqués), environnements aligned/cases/system, fraction, constante pi ; contexte document (numérotation séquentielle des équations, table des labels, résolution des refs, label inconnu → HTSLError localisée) ; rendu KaTeX (optionnel) + fallback LaTeX brut ; numéro d'équation en HTML/CSS.
- `src/objects/css.ts` : `mathCss` (style par défaut). `HTSLError` accepte un source optionnel (erreurs au rendu).
- Renderer : prise en charge des nœuds `object` (compact + pretty) ; `compile` transmet le source au render.
- `tests/math.test.ts` : 18 tests (chaque objet, numérotation, refs valides/invalides, imbrication, équivalence AST `$x$`≡`{@mti:x}` et `$$x$$`≡`{@mtb:x}`, KaTeX injecté + fallback). Total : **92 tests** verts, zéro régression.
- Démo : `demo-formulas.htsl` + `npm run demo:formulas` ; `examples/formulas.html` (édition live, KaTeX CDN, mathCss).
- `teste.html` (local, gitignored) enrichi : KaTeX CDN + mathCss + exemple de formules.
- Limite documentée : pas d'accolades LaTeX brutes dans `{line}`/`{case}`.
- Bundles régénérés (`npm run build` + `build:min`) : API math disponible en ESM et globals navigateur.
- README et `.docs/03-collection-math-text.md` ajoutés/mis à jour.

### Amélioration : contenu LaTeX dans {line}/{case}

- Les tags `line`/`case` ont désormais un corps lu en mode math (lexer) : `\text{}`, `\frac{}{}` et objets `{@...}` y sont permis. Corrige le rendu typographique (ex. `\text{si }`).
- `.claude/launch.json` ajouté (serveur statique local pour prévisualiser `teste.html`). Rendu confirmé en navigateur (KaTeX + Tailwind).

### Composants & variables (expansion d'AST)

- Syntaxe : `{!define name[params]: body}`, usage `{@name[...]:...}` avec `{$children}` ; variables `{!set name: val}` + `{$name}` (texte, attributs, corps).
- Tokens `DEFINE_OPEN`/`SET_OPEN`/`VARREF` ; nœuds AST `DefineNode`/`SetNode`/`VarRefNode` + type `Param`.
- Lexer : directives `{!define}`/`{!set}` et `{$...}` (contenu + math), frames `directive`.
- Parser : `parseDefine`/`parseParams`/`parseSet`, `VARREF` dans contenu et math.
- `src/components/expand.ts` : collecte des `!define` (1ʳᵉ passe, usage avant définition), expansion (params + défauts + `{$children}`, interpolation des attributs, portée document des variables), erreurs localisées (param manquant, variable inconnue, récursion infinie, profondeur max 64, collision registre, doublon).
- `render` exécute `expand` en tête (le renderer ne voit que des nœuds normaux) ; `expand` exporté.
- `tests/components.test.ts` : 20 tests. Total : **112 tests** verts, zéro régression.
- `demo-formulas.htsl` réécrit avec un composant `card` réutilisé ; `teste.html` : 9 cartes Tailwind depuis une seule définition `card` + variable `accent` (rendu navigateur confirmé).
- Bundles régénérés ; README et `.docs/04-composants-et-variables.md` ajoutés.

### Géométrie via Plotly (mg2/mg3)

- Alias de collection `mg2`→`math.geometry.2d`, `mg3`→`math.geometry.3d` ; objets enregistrés (scenes html, formes void).
- `src/objects/geometry.ts` : `toPlotly(node, dim)` (une fonction par forme), `sceneSpec` (traces + layout, cadrage 2D depuis les objets finis, aspectmode data en 3D), `latexOfGeometry`, `isGeometryPath`/`isScenePath`.
- Formes : 2D point/segment/circle/polygon/droite ; 3D point/vector(ligne+cone)/segment/line/plane(mesh3d)/sphere(surface).
- `math.ts` : scenes → `renderScene` (`<div data-htsl-scene=JSON>` + repli) ; géométrie hors-scène → `latexOfGeometry` (notation LaTeX, ex. plan → `2x - y + 3z = 5`).
- `src/scene-client.ts` : `hydrateScenes(root?, Plotly?)` (appelle `Plotly.newPlot`, no-op sans DOM/Plotly). Le cœur ne dépend jamais de Plotly.
- Lexer : ajout d'un lexème nombre dans l'en-tête (valeurs décimales non quotées comme `opacity=0.5`).
- `tests/geometry.test.ts` : 16 tests (structure des traces, scène 2D/3D, règle de contexte, repli sans Plotly). Total : **128 tests** verts, zéro régression.
- `demo-geometry.htsl` + `npm run demo:geometry` ; `examples/geometry.html` (Plotly CDN) ; `teste.html` enrichi de 2 scènes. Rendu 2D et 3D confirmé en navigateur (plan, sphère, point, vecteur, cercle, polygone, droite).
- Bundles régénérés ; README, `.docs/05-geometrie-plotly.md` ajoutés.

### Repères de scène (décor / acteur)

- Règle d'architecture : dans une scène, un objet **décor** (frame/space) configure le cadre (au plus un, erreur localisée si doublon, pris en compte où qu'il soit) ; les **acteurs** sont dessinés. `plane` reste l'acteur `mg3.plane`.
- Objets : `math.geometry.2d.frame` (alias `mg2.frame`, `repere`), `math.geometry.3d.space` (`mg3.space`), `math.geometry.2d.cpoint` (affixe complexe).
- `frame` 2D : `xrange`/`yrange`/`grid`/`ticks`/`equal` (défaut true = orthonormé, scaleanchor)/`axes`/`labels` ; variante `type=complex` (axes Re(z)/Im(z), `range`, `unitcircle` en pointillés).
- `space` 3D : `xrange`/`yrange`/`zrange`/`grid`/`ticks`/`equal` (aspectmode)/`labels` (défaut "x,y,z").
- `cpoint` : `parseComplex` (a+bi, a-bi, bi, a, négatifs, décimales).
- `sceneSpec(scene, source?)` : sépare décor/acteurs, erreur localisée si deux repères, `build2dLayout`/`build3dLayout` ; sans décor, comportement inchangé. Hors-scène, `latexOfGeometry` rend une notation de repère.
- Lexer inchangé (les décimales étaient déjà gérées) ; `renderScene` reçoit `source`.
- `tests/frame.test.ts` : 18 tests. Total : **146 tests** verts, zéro régression.
- `demo-geometry.htsl` et `examples/geometry.html` mis à jour (repère gradué, plan complexe + cercle unité + affixes, space 3D) ; rendu confirmé en navigateur (cercle unité pointillé, affixes A/B/i, axes Re(z)/Im(z)).
- Bundles régénérés ; README (règle décor/acteur) et `.docs/06-reperes-scene.md` ajoutés.

### API d'introspection + Playground web

- Registre refondu en `registerObject(meta)` : description, schéma d'attributs (nom/type/requis/défaut/description/enum), exemple ; renseigné pour les 25 objets. Rétrocompatible (resolvePath/isKnownObject/contentModelOf).
- `src/introspect.ts` : `registry.list()`/`describe()` + `documentComponents()`/`documentVariables()` (introspection des {!define}/{!set} après parsing). Exposé via `registry` (named + htsl_engine).
- `tests/introspect.test.ts` : 11 tests. Total : **157 tests** verts, zéro régression.
- Playground `playground/` (Vite + TypeScript, workspace npm, moteur importé via alias `../src`) :
  - 3 panneaux redimensionnables (éditeur CodeMirror 6 · rendu · AST masquable).
  - Rendu à la frappe (debounce 150 ms), parser tolerant ; erreurs en bandeau + soulignées (lint, ligne/col → offset) ; dernière sortie valide conservée → la page ne casse jamais.
  - `htsl-lang.ts` : StreamLanguage CodeMirror écrite à la main (content/header/math) ; coloration complète.
  - `complete.ts` : autocomplétion contextuelle (objets/composants après {@, attributs après [, variables après {$, directives après {!) parsant le document à la volée (suggestions à jour).
  - KaTeX + Plotly chargés et injectés (peerDependency) ; exemples préchargés ; boutons copier/télécharger/partage par hash d'URL ; `npm run playground:build` → dist statique.
- Vérifié en navigateur : coloration, rendu KaTeX, scène 3D Plotly, AST, bandeau + soulignement d'erreur (page vivante), autocomplétion (objets, attributs avec défauts, variables en direct).
- `.gitignore` : `playground/dist/` ; scripts racine `playground` / `playground:build` ; `.docs/07-introspection-et-playground.md`.

### Playground : rendu en iframe isolée (frameworks CSS au choix)

- Panneau de rendu passé en **iframe sandbox** (`frame-doc.ts` + `srcdoc`) : l'utilisateur charge n'importe quel framework depuis son HTSL (`{link[rel="stylesheet", href="…bootstrap"]/}`, `{script[src="…tailwindcss"]/}`), exécuté dans l'iframe et isolé de l'UI du playground.
- KaTeX CSS toujours fourni dans l'iframe ; Plotly chargé seulement si une scène est présente (hydratation inline). Plotly retiré du bundle parent.
- Tailwind n'est plus codé en dur ; exemples mis à jour pour charger leur framework eux-mêmes ; nouvel exemple **Bootstrap**.
- Vérifié en navigateur : Bootstrap (alerte/cartes/boutons) et Tailwind chargés depuis le document, scène 3D Plotly dans l'iframe, UI du playground intacte.

### Restructuration en monorepo + paquet @htsl/codemirror

- **Monorepo npm workspaces** : moteur déménagé (`git mv`) vers `packages/core/` (paquet `htsl`, 157 tests à l'identique) ; nouveau `packages/codemirror/` (`@htsl/codemirror`) ; `playground/` privé. `package.json` racine (workspaces + scripts globaux `npm test`/`build`/`typecheck`/`dev`). README racine = monorepo, README moteur dans core.
- **@htsl/codemirror** : extensions CodeMirror 6 réutilisables extraites du playground — `htslLanguage()` (StreamLanguage maison, thème inline auto-suffisant), `htslCompletion(registry)` (autocomplétion branchée sur l'introspection), `htslLinter(parse)` (+ helper `htslDiagnostics`). Peer deps `@codemirror/*`/`@lezer/highlight`/`htsl`. README d'intégration < 10 lignes. 21 tests (tokenisation, complétion via CompletionContext, diagnostics).
- **Bug réel corrigé (avec test)** : le tokenizer de coloration avalait les `.classes` (le regex du tag incluait `.`) — corrigé (tag sans point hors crochets, valeurs avec point dans `[...]`).
- **Playground** rebranché sur `@htsl/codemirror` (alias Vite/TS vers les sources) : ne réimplémente plus rien de l'éditeur ; supprime `htsl-lang.ts`/`complete.ts` locaux. Build des 3 paquets OK (core tsup, codemirror tsup externalisé, playground vite 666 Ko).
- `teste.html` : chemin du bundle mis à jour (`packages/core/dist-min/`).
- Vérifié en navigateur : coloration, autocomplétion (`{@mg2.`) et soulignement d'erreurs (ligne/col) fournis par le paquet ; rendu Tailwind/KaTeX dans l'iframe.
- Total : **178 tests** verts (core 157 + codemirror 21). `.docs/08-monorepo-et-codemirror.md` ajouté.



