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

### Restructuration en monorepo + paquet @noah-medra/htsl-codemirror

- **Monorepo npm workspaces** : moteur déménagé (`git mv`) vers `packages/core/` (paquet `htsl`, 157 tests à l'identique) ; nouveau `packages/codemirror/` (`@noah-medra/htsl-codemirror`) ; `playground/` privé. `package.json` racine (workspaces + scripts globaux `npm test`/`build`/`typecheck`/`dev`). README racine = monorepo, README moteur dans core.
- **@noah-medra/htsl-codemirror** : extensions CodeMirror 6 réutilisables extraites du playground — `htslLanguage()` (StreamLanguage maison, thème inline auto-suffisant), `htslCompletion(registry)` (autocomplétion branchée sur l'introspection), `htslLinter(parse)` (+ helper `htslDiagnostics`). Peer deps `@codemirror/*`/`@lezer/highlight`/`htsl`. README d'intégration < 10 lignes. 21 tests (tokenisation, complétion via CompletionContext, diagnostics).
- **Bug réel corrigé (avec test)** : le tokenizer de coloration avalait les `.classes` (le regex du tag incluait `.`) — corrigé (tag sans point hors crochets, valeurs avec point dans `[...]`).
- **Playground** rebranché sur `@noah-medra/htsl-codemirror` (alias Vite/TS vers les sources) : ne réimplémente plus rien de l'éditeur ; supprime `htsl-lang.ts`/`complete.ts` locaux. Build des 3 paquets OK (core tsup, codemirror tsup externalisé, playground vite 666 Ko).
- `teste.html` : chemin du bundle mis à jour (`packages/core/dist-min/`).
- Vérifié en navigateur : coloration, autocomplétion (`{@mg2.`) et soulignement d'erreurs (ligne/col) fournis par le paquet ; rendu Tailwind/KaTeX dans l'iframe.
- Total : **178 tests** verts (core 157 + codemirror 21). `.docs/08-monorepo-et-codemirror.md` ajouté.

### Optimisation de la réactivité du playground

- Audit : `srcdoc` rechargeait toute l'iframe à chaque frappe (re-parse + KaTeX + Plotly). Garde de source ajoutée (`run()` sort si le texte est inchangé).
- **Renderer** : option `hashBlocks` (off par défaut) → estampille `data-htsl-hash` (hash FNV-1a stable du sous-arbre, `src/hash.ts`) sur les nœuds de premier niveau, blocs math et scènes. `htslHash` exporté.
- **Cache KaTeX** : mémoïsation LaTeX→HTML (`Map` limite 500, éviction) dans `math.ts` ; `clearKatexCache()` exporté.
- **Préservation Plotly** : `hydrateScenes` saute les scènes inchangées (hash), utilise `Plotly.react` si seules les données changent.
- `tests/perf.test.ts` (10 tests) : hashBlocks (stable, top-level only, math/scènes), htslHash, cache KaTeX (1 appel pour formule répétée). Total moteur : **167 tests**.
- **Playground** : iframe persistante + `FrameRenderer` (morphdom) — `frame.ts` remplace `frame-doc.ts` ; frameworks réconciliés dans le `<head>`, blocs au hash identique sautés, scènes jamais re-plottées sans changement. Bandeau dev : temps + nœuds touchés. Exemple « Performance (30 cartes + 2 scènes) ».
- Vérifié en navigateur : éditer un mot → **3 nœuds touchés / 2410, ~10 ms**, scènes identiques et non re-plottées (`sameSceneNodes`/`plottedSame` true).
- `.docs/09-optimisation-playground.md` ajouté.

### Édition du texte depuis le rendu

- Cœur (opt-in) : le lexer enregistre `start`/`end` sur les jetons TEXT ; `parse(src, { ranges: true })` attache `range: [start,end]` aux nœuds texte ; `render(ast, { editableText: true })` enveloppe les textes adossés au source dans `<span class="htsl-edit" data-htsl-text="start-end">`. Variables et math non enveloppés. AST inchangé par défaut.
- `tests/editable.test.ts` (7) : plage = sous-chaîne brute exacte, off par défaut, offsets corrects, pas de span pour variable/math. Total core : **174 tests**.
- Playground : parse `ranges` + render `editableText` ; `FrameRenderer` rend les spans `contenteditable=plaintext-only` et, au `focusout`, réécrit le source (ré-échappement de `{ } : $`, remplacement de `source[start:end]`, rendu immédiat). Affordance survol/focus.
- Bug corrigé : `instanceof Element` échouait à travers l'iframe (réalmes) → duck-typing.
- Vérifié en navigateur : édition d'un titre → source réécrit ; saisie `Prix: {remise} $5` → source `Prix\: \{remise\} \$5`, rendu littéral ; formules/références non éditables.
- `.docs/10-edition-texte-depuis-rendu.md` ajouté.

### Couche d'authoring (palette, snippets, slash, aide)

- Cœur : métadonnées du registre étendues avec `snippet` (template à trous) + `category` (structure/formules/géométrie/document) + `kind` (object/element). Balises HTML courantes (h1, p, ul, table, a, img…) enregistrées comme `kind:"element"` — introspectables mais sans effet sur le lexer/parser (filtrés par kind). `registry.list()` renvoie les champs riches. Tests : snippets/catégories présents, éléments HTML kind=element, `isKnownObject` faux pour eux, **chaque exemple compile** (aperçus sûrs). Core : **179 tests**.
- `@noah-medra/htsl-codemirror` : `htslCompletion` insère les snippets (`snippet()` de CodeMirror, trous au Tab) après `{@` ; **commande slash** `/` en début de ligne (objets + HTML + composants), filtre après le `/`, insertion remplaçant le `/`. 25 tests.
- Playground : **palette** drawer (➕), groupée par catégorie, recherche, aperçus rendus compilés (cachés), clic = insertion du snippet ; **aide contextuelle** sous l'éditeur (describe() de l'objet au curseur : description + tableau d'attributs). Déclenchement slash via `startCompletion`.
- Bug corrigé : le `from` du slash incluait le `/` → CM filtrait sur « /x » contre des labels sans `/` (tout exclu) ; corrigé (filtre après le `/`, apply depuis le `/`).
- Test cible vérifié en navigateur : titre + équation numérotée (1) + scène 3D construits **à la souris** (clics palette) → rendu correct.
- Syntaxe du langage inchangée. `.docs/11-couche-authoring.md` ajouté.

### Palette retravaillée (retour utilisateur)

- **Conteneurs regroupés en tête** : composants définis par l'utilisateur (lus à chaque ouverture via `registry.components(parse(doc))`) + scènes 2D/3D, séparés des objets simples. Ordre : Conteneurs, Structure, Formules, Équations, Géométrie (acteurs, scènes exclues).
- **Aperçus en texte** au lieu de formules rendues : `compile(example)` sans KaTeX → texte du rendu (maths en LaTeX source), plus léger/clair ; scènes = « 🧊 Graphique interactif ». KaTeX retiré de la palette.
- **Description lisible en avant**, chemin technique discret (l'éditeur est pour les power users).
- **Contenu tampon à l'insertion** : scènes pré-remplies d'un acteur (cercle/point 2D, sphère 3D) ; composants remplis de `Contenu du conteneur.` et leurs paramètres sans défaut prennent leur nom comme valeur → HTSL valide qui **rend immédiatement** (plus d'attribut vide malformé `name=`). Snippets de scène mis à jour dans le cœur ; `componentSnippet` (palette + @noah-medra/htsl-codemirror) corrigé.
- Vérifié en navigateur : groupe Conteneurs (card + scènes), aperçus texte, card inséré rend `.card` + titre + contenu, scène 3D rend 1 tracé Plotly.

### Classification de la palette + édition d'un élément depuis le rendu (retour utilisateur)

- **Palette reclassée** en 5 groupes nets : `Objets créés` (composants de l'utilisateur, avec libellé d'aide si vide) · `Textes` (structure) · `Formules` (formules + équations) · `Scènes` (conteneurs 2D/3D) · `Géométrie` (acteurs). Les scènes sont désormais séparées des composants.
- **Édition d'un élément entier depuis le rendu** (extension de l'édition de texte) :
  - Cœur : offsets absolus sur *tous* les jetons `{`/`{@`/`}` (lexer) ; le parser attache `range:[début,fin]` aux nœuds `element`/`object` sous `ranges:true` (couvre tout le `{…}`). L'expansion préserve la plage des éléments écrits ; pour un composant, les plages internes (template) sont retirées et la plage de l'**appel** `{@…}` est exposée sur la racine de l'instance. `render(..., {editableText:true})` émet `data-htsl-range`.
  - Playground : survol d'un élément (hors texte) = halo bleu ; clic = textarea inline pré-remplie avec la **source HTSL** du bloc ; `⌘/Ctrl+Entrée`/blur valide (remplacement brut de `source[début:fin]`), `Échap` annule. Clic sur texte = édition de texte (les deux modes cohabitent).
  - Bug trouvé/corrigé : seuls les `}` de `lexDefault` portaient les offsets ; ajoutés aussi aux `}` d'en-tête/math et aux OBJOPEN (sinon objets/scènes sans plage).
- Vérifié en navigateur : `{h1:…}` → édité en `{h1.vedette:Titre modifié}` (classe+texte MAJ) ; instance de composant ouvre `{@carte[titre=Salut]: Corps.}` ; Échap annule ; édition de texte intacte.
- Core **184** tests (10 plages d'éléments), codemirror 25. Syntaxe du langage inchangée.

### Éditeur de bloc = vrai CodeMirror dans le rendu (retour utilisateur)

- Le textarea d'édition de bloc devient un **véritable éditeur CodeMirror HTSL** (`playground/src/block-editor.ts`) : coloration syntaxique, autocomplétion (`{@`, `/`, attributs) et linter — les mêmes extensions que l'éditeur principal via `@noah-medra/htsl-codemirror`. Objectif : tout faire depuis le rendu (l'éditeur principal devient optionnel).
- Architecture : monté dans le **document parent** (où CM fonctionne) puis positionné en superposition sur l'élément via l'offset de l'iframe ; popups rendus dans `<body>` (`tooltips({parent})`) pour échapper à l'`overflow:hidden`. Le frame ne crée plus de textarea : au clic il notifie le parent `onBlockClick(start, end, rect)`.
- Validation `⌘/Ctrl+Entrée` (bindings `Mod-Enter` **et** `Ctrl-Enter` pour Mac+autres) ou perte de focus réelle (`view.hasFocus`) ; `Échap` annule (après le `completionKeymap` pour que Échap ferme d'abord le popup). Un seul éditeur de bloc à la fois.
- Vérifié en navigateur : clic sur `{h1:…}` ouvre un CM coloré ; édité en `{h1.vedette#intro: …}` puis Ctrl+Entrée → source réécrite + rendu MAJ ; Échap annule. (Le popup d'autocomplétion exige le focus réel, non disponible dans le harness de capture, mais l'extension est identique à l'éditeur principal éprouvé.)

### Éditeur de bloc translucide (retour utilisateur)

- L'overlay d'édition devient **semi-transparent + flou** (`rgba(255,251,235,.55)` + `backdrop-filter: blur(4px)`, surfaces CM en `transparent`) : le **rendu reste visible dessous pendant l'édition** — pratique quand une audience suit le rendu pendant que quelqu'un édite. CSS uniquement (`playground/src/style.css`).
- L'éditeur principal (le fichier) n'est jamais couvert par l'overlay (positionné sur le panneau de rendu) : on peut éditer indifféremment depuis le **rendu** ou depuis le **fichier** (cliquer le fichier valide l'overlay et rend la main).
- Vérifié en navigateur : overlay translucide laissant voir le titre rendu + l'équation derrière, texte coloré lisible.
- Affinage : opacité abaissée à ~22 % + halo blanc (`text-shadow`) sur le texte pour rester lisible (le rendu transparaît nettement).

### Indentation (retour utilisateur : « pourquoi l'indentation ne marche pas ? »)

- Cause : le `StreamLanguage` HTSL n'avait pas de méthode `indent`, et aucune touche **Tab** n'était liée → ni auto-indentation à l'Entrée, ni Tab.
- `@noah-medra/htsl-codemirror` : ajout d'`indent` au parser (profondeur = nb de frames d'accolades ouvertes × `unit` ; une ligne commençant par `}` se désindente d'un niveau) + `languageData.indentOnInput = /^\s*\}$/` (réindente en tapant `}`). 4 tests via `getIndentation` (1 bloc → 2, imbriqué → 4, `}` → 0, racine → 0). codemirror **29** tests.
- Playground : `indentWithTab` ajouté au keymap de l'éditeur principal **et** de l'éditeur de bloc (Tab indente, Shift-Tab désindente).
- Vérifié en navigateur : `{ul:` + Entrée → `{ul:\n  ` ; Tab sur une ligne → `  …`.




## Texte brut `{script:…}` / `{style:…}` + exécution des scripts inline (retour utilisateur)

Le moteur cassait sur du JS dans `{script:…}` (les `{`/`}` étaient parsés comme du HTSL) et CodeMirror ne colorait pas le JS.

- **Moteur** : nouvelle frame lexer `raw` pour les balises `script`/`style` (RAW_TEXT_TAGS). Le corps est lu **verbatim** jusqu'au `}` qui équilibre l'ouvrante (comptage d'accolades en ignorant chaînes, gabarits `` `…` `` et commentaires `//` `/* */`). Le renderer émet ce corps **sans échappement** (`rawTextOf`). 7 tests (`tests/raw-text.test.ts`). Core **191**.
- **@noah-medra/htsl-codemirror** : frame `raw` (lang js/css) dans le StreamLanguage → coloration JS (mots-clés, nombres, chaînes, commentaires, gabarits multi-lignes via l'état), CSS minimal ; comptage d'accolades pour reprendre le HTSL après le `}`. Tags `keyword`/`number` ajoutés. 4 tests. codemirror **33**.
- **Playground** : `FrameRenderer` n'hisse plus que `link, script[src]` dans `<head>` ; les scripts **inline sont exécutés après le morphing** (recréés car morphdom les insère inertes), une fois par contenu unique (`ranScripts`) → documents interactifs (diaporamas…).
- Vérifié en navigateur avec l'exemple diaporama de l'utilisateur : aucune erreur de parse, JS coloré, script exécuté, clic « Suivant » qui change de slide.

## Refactor de la couche d'exécution JS : 100 % déclaratif + runtime unique

Trois bugs structurels (Plotly is not defined / Identifier already declared / getElementById null) venaient de `<script>` impératifs dans le HTML. Refactor vers une sortie déclarative + un runtime unique.

- **Renderer déclaratif** (`packages/core/src/renderer.ts`) : `{script: code-inline}` devient **inerte** (`<script type="text/plain">`, `</script>` neutralisé) — le contenu HTSL ne produit plus de JS exécutable ; `{script[src]/}` externe et `{style:…}` restent permis. Les scènes étaient déjà déclaratives (`data-htsl-scene`).
- **Runtime unique** (`packages/core/src/runtime.ts`, nouveau) : `loadDependency(url,win)` (Promise cachée par fenêtre+URL), `hydrate(root,win)` (idempotent : charge la dépendance seulement s'il y a du travail, `Plotly.react` au changement de hash, rien si inchangé, marque `data-htsl-init`), `purge(removed,win)` (`Plotly.purge`), `installHtslRuntime` (global `window.HTSL`, DOMContentLoaded + MutationObserver pour le mode standalone). `scene-client.ts` enrichi (`pendingScenes`, `purgeScenes`, marqueur `data-htsl-init`).
- **Playground** (`frame.ts`) : rustines supprimées (`runInlineScripts`, `ranScripts`, `plotlyLoading`, injection `<script>` Plotly, ancien `hydrate()`). Après morphing : `purge(scènes retirées, iframeWin)` puis `hydrate(root, iframeWin)`.
- **Tests** : `tests/runtime.test.ts` (faux DOM minimal) — cache loadDependency, idempotence hydrate, react au changement de hash, purge au retrait, pas de chargement si rien à faire. `raw-text.test.ts` adapté (inline inerte). Core **197**, codemirror **33**.
- **Vérifié en navigateur** : scène 3D + **10 modifications consécutives** → 0 erreur console, 1 seul plot (react, pas de fuite), 1 seul script Plotly. Retrait → purge appelé ; script inline inerte (non exécuté) ; re-ajout → redessine.
- Décisions de périmètre (confirmées) : formules restent en rendu eager (déjà sans `<script>`, KaTeX dépendance future) ; scripts inline inertes (point 4). `.docs/12-runtime-declaratif.md` ajouté.

## Scènes 3D animées déclaratives (collection s3 / Three.js)

Suite au choix « scènes 3D natives » : pour de l'interactif 3D sans JS inline (interdit par le point 4), nouvelle collection déclarative.

- **Cœur** : `objects/three.ts` (`threeSpec`, `renderThree`, `isThreePath`) ; registre `scene.3d.scene/sphere/box` (alias collection `s3`) avec attrs `x/y/z`, `color`, `radius`/`size`, `spin`, `orbit`+`speed`, `glow`. Le renderer émet `<div class="htsl-three" data-htsl-three='{objects:[…]}'>` — **zéro `<script>`**. `renderer.ts` : `math()` → `object()` qui dispatche three vs math.
- **Runtime** : `three-client.ts` (`pendingThree`, `hydrateThree`, `purgeThree`) construit la scène Three.js + boucle `requestAnimationFrame`, reconstruit au changement de hash, libère le contexte WebGL (`forceContextLoss`) au teardown. `runtime.ts` déclare Three.js comme dépendance et l'orchestre (hydrate/purge). `frame.ts` : morphing généralisé (htsl-scene **et** htsl-three préservés/purgés via une table `DYNAMIC`).
- **Tests** : `tests/three.test.ts` (5) — nœud de données sans `<script>`, spec JSON (positions/animation/glow), défauts, alias s3, présence registre. Core **202**, codemirror 33.
- **Vérifié en navigateur** : système solaire (soleil glow + 2 planètes en orbite) rendu en WebGL, animé (rAF ~373 appels), **10 modifications consécutives → 0 erreur, 1 seul canvas** (teardown correct, pas de fuite de contexte), 1 seul script Three.js. Retrait → teardown (0 canvas).

## Boîte à outils 3D maths/physique (collection s3 étendue)

Objectif : un maximum d'objets déclaratifs utiles aux mathématiciens/physiciens, sur le modèle s3/runtime (zéro `<script>`).

- **Nouvelles primitives** (`objects/three.ts` + registre) : formes `s3.torus`, `s3.cylinder`, `s3.cone`, `s3.plane`, `s3.point` (en plus de sphere/box) ; `s3.vector` (flèche from→to — forces/champs) ; `s3.line` (ligne/trajectoire depuis `points="(x,y,z);…"`) ; helpers `s3.axes` et `s3.grid`. Options de scène : `distance` (caméra), `controls` (OrbitControls souris), `autorotate`. ~12 objets s3.
- **Runtime** (`three-client.ts`) : construit chaque type (géométries, ArrowHelper, Line/BufferGeometry, AxesHelper, GridHelper), applique spin/orbit, auto-rotation du groupe, OrbitControls (addon chargé à la demande via `loadDependency` quand `controls=true`), opacité/transparence. `forceContextLoss` au teardown.
- **Bug lexer corrigé** (pré-existant, exposé par les coords 3D) : un nombre négatif décimal non quoté `x=-2.5` cassait (le `-` routait vers `lexIdent`, qui s'arrête au `.`). `lexNumber` consomme désormais un `-` initial ; `-<chiffre>` → nombre. Bénéficie à tout le langage. Test parser ajouté.
- **Tests** : `three.test.ts` étendu (vecteurs, lignes, axes, grille, options, exemples qui compilent). Core **205**, codemirror 33.
- **Vérifié en navigateur** : scène riche (axes + grille + sphère-soleil + tore + cylindre + cône + boîte + vecteur + trajectoire + point en orbite) rendue en WebGL, animée, OrbitControls + auto-rotation, **0 erreur console**.

## Évaluateur d'expressions + surfaces/courbes 3D + traceur 2D (maths/physique)

Suite « ajoutez vos suggestions » : objets basés sur un évaluateur mathématique sûr.

- **`objects/expr.ts`** : interpréteur d'expressions **sûr** (pas de eval/Function/global) — tokenizer + descente récursive → closure `(scope)=>number`. Opérateurs `+ - * / % ^` (^ droite-assoc, lie plus fort que le moins unaire), fonctions (sin/cos/exp/log/sqrt/abs/min/max/…), constantes (pi/e/tau/phi), variables. `compileExpr`/`safeExpr` exportés. 6 tests.
- **`s3.surface`** : surface `z=f(x,y)` échantillonnée (grille res×res → champ de hauteurs en données) ; le runtime construit une BufferGeometry (normales calculées, double face). **`s3.curve`** : courbe paramétrique `(x(t),y(t),z(t))` échantillonnée → points → Line.
- **`{@plot[fn="…"]}`** (`objects/plot.ts`) : graphe 2D `y=f(x)` échantillonné, rendu via le **chemin Plotly déclaratif** (nœud `htsl-scene`, zéro `<script>`). Alias `plot`.
- **Fix `hasPlot`** (scene-client) : Plotly pose `js-plotly-plot` **sur** l'élément (pas dessous) → l'ancien `querySelector` rendait `hasPlot` toujours faux (redessin à chaque hydrate). Corrigé en `classList.contains(...) || querySelector(...)` → `react`/skip fonctionnent vraiment.
- **Tests** : `expr.test.ts` (6), `three.test.ts` étendu (surface/courbe/plot). Core **214**, codemirror 33.
- **Vérifié en navigateur** : surface `sin(x)cos(y)` + courbe paramétrique 3D + sinc `sin(x)/x` en 2D, rendus ensemble, 5 modifs → 0 erreur.

## Labels 3D + multi-courbes 2D (sans alourdir le moteur)

- **Labels texte 3D** (sans CSS2DRenderer ni addon) : `s3.label[text=…]` et attribut `label` sur les maillages → billboard `Sprite` + texture canvas (texte net, toujours face caméra), dessiné côté runtime via le cœur de Three.js. Disposition des géométries/matériaux/textures au teardown (anti-fuite). Le three-client reçoit `document` pour créer le canvas.
- **Multi-courbes 2D** : `{@plot}` devient un conteneur (contentModel html) ; objet `plot.curve` (fn/label/color). `renderPlot` agrège les courbes en un seul nœud Plotly multi-traces avec légende et palette par défaut. La forme `{@plot[fn=…]}` (une courbe) reste valable. Toujours rendu via le chemin déclaratif Plotly.
- **Tests** : `three.test.ts` étendu (multi-courbes + légende, label autonome + attaché). Core **216**, codemirror 33.
- **Vérifié en navigateur** : scène 3D avec labels (« origine », points A/B) + graphe « Trigonométrie » à 3 courbes (sin/cos/sinc) avec légende, 0 erreur.

## Animations 3D déclaratives par id (s3.animate)

Proposition utilisateur : des blocs d'animation référençant les objets par `id`. Implémenté + improvisations.

- **IDs** : attribut `id` sur les maillages (cible des animations).
- **`s3.animate`** : actions `move` (vers (x,y,z)), `rotate` (axis/angle), `scale` (value ou (sx,sy,sz)), `color`, `fade` (opacité), `transform` (adopte position+couleur d'un autre objet par id). Options `duration`, `delay`, `at` (départ absolu), `easing` (linear/easeIn/easeOut/easeInOut). Scène `loop` (défaut true).
- **Timeline** (`three-client.ts`) : par cible, les animations s'enchaînent (curseur séquentiel, `at`/`delay` pour chevaucher). À la construction on précalcule des segments {start, end, from, to} (état complet pos/quat/scale/color/opacity) ; au runtime, interpolation par image (lerp position/échelle/couleur, slerp rotation, ease). Les objets ciblés sont exclus du spin/orbit (exclusion mutuelle).
- **Tests** : `three.test.ts` (collecte par id, parsing move/rotate/transform, registre). Core **218**, codemirror 33.
- **Vérifié en navigateur** : exemple utilisateur (A move→rotate→scale→transform vers B) joué en boucle, 0 erreur ; capture montre A agrandi, déplacé et passé à la couleur de B.

## Vrai morph de géométrie pour transform (cube → sphère → tore…)

L'action `transform` devient un **vrai morph de forme** (pas seulement position+couleur).

- **Grille canonique commune** (`three-client.ts`, 48×32) : toute forme morphable (sphere/box/torus/cylinder/cone/plane/point) est rééchantillonnée par une fonction de surface (sphère UV ; cube = projection max-norm ; tore/cylindre/cône/plan paramétrés) → même nombre/ordre de sommets pour toutes.
- **Morph targets Three.js** : la cible A est construite avec la géométrie de A en base et la géométrie de B (même grille) en morph attribute (positions + normales). Matériau `morphTargets`/`morphNormals`. L'influence `morphTargetInfluences[0]` est pilotée par la timeline sur le segment `transform` (ease), 0→1, et remise à 0 à la boucle.
- **Sémantique** : `transform` morphe **forme + couleur sur place** (le morph encode la taille de B ; B est un gabarit, sa position n'importe pas — utiliser `move` pour déplacer). A et B doivent être des formes morphables (sinon repli sur couleur seule).
- **Vérifié en navigateur** : cube → tore réel (changement de forme vertex-à-vertex + couleur), gabarit hors champ, 0 erreur. Core 218, codemirror 33.

## Valeur brute (LaTeX) dans {!set} via guillemets

`{!set H: \tfrac{1}{2}…}` échouait : la valeur d'un set est lue comme du HTSL, donc les `{}` LaTeX deviennent des balises (`{1}` → balise invalide).

- **Fix** : une valeur de directive **entre guillemets** est lexée **verbatim** (`lexRawString` : garde `{}`/`\`, seul `\"` → `"`), émise comme un seul nœud texte. `nextNonSpace()` détecte le guillemet après le `:`. L'interpolation non quotée (`{!set who: monde}`, `text-{$c}-600`) reste inchangée.
- Usage : `{!set H: "\tfrac{1}{2}\big(p^2 + \omega^2 q^2\big)"}` puis `{@mte: H = {$H}}` → rendu KaTeX, équation numérotée + référence croisée.
- Test (`components.test.ts`) : valeur quotée verbatim, pas d'erreur, braces non parsées. Core 219.
- Vérifié en navigateur : hamiltonien H = ½(p²+ω²q²) typographié (KaTeX), 0 erreur.

## Pliage de code dans l'éditeur

Les blocs multi-lignes `{…}` / `{@…}` n'étaient pas repliables. HTSL est un
`StreamLanguage` écrit à la main (pas d'arbre Lezer) → pliage via un
`foldService` maison (`packages/codemirror/src/language.ts`) : `htslFold` compte
les accolades à partir de la fin de ligne, ignore celles dans les chaînes `"…"`
et après `\`, et renvoie la plage de la fin de ligne jusqu'au `}` fermant si
celui-ci est sur une ligne ultérieure. Branché via `LanguageSupport([…,
foldService.of(htslFold)])` ; le playground active `codeFolding()` +
`foldGutter()` + `foldKeymap`. Tests (`language.test.ts`) : pliage multi-ligne,
ligne simple non pliable, accolades dans chaînes, blocs imbriqués. Codemirror 37.
Vérifié : le marqueur `⌄` plie un `{div.card:…}` (9→6 lignes, placeholder `…`),
rendu inchangé.

## Édition de bloc réservée aux composants définis, par instance

L'édition depuis le rendu s'ouvrait pour toute balise parente. Restreinte aux
**instances de composants `{!define}`**, et chaque instance montre **son propre
appel** `{@nom[…]: ses children}` — pas la définition partagée. Le lexer porte
des offsets sur `{` `{@` `}` (`DEFINE_OPEN` inclus) ; `DefineNode` reçoit une
`range`. À l'expansion (`expand.ts`), les plages internes du template sont
retirées, et la racine de l'instance est marquée `component = nom` avec la
`range` de **l'appel** (`usage.range`, pas `component.range`). Le renderer émet
`data-htsl-component="nom"` ; le playground (`frame.ts`) cible
`[data-htsl-component]` au survol/double-clic. Vérifié : double-clic sur un `h1`
n'ouvre rien ; sur une instance, l'éditeur s'ouvre pré-rempli avec l'appel propre
à l'instance. Core 220, codemirror 37.

## Persistance & lien partageable (sans serveur)

Les documents disparaissaient au rafraîchissement et n'étaient pas partageables.
Solution 100 % client (`playground/src/persistence.ts`, voir
`.docs/13-persistance-et-partage.md`) : **auto-save** dans `localStorage`
(`htsl:doc`, écrit à chaque frappe → F5 ne perd rien) + **lien compressé** —
**Partager** encode tout le document en gzip (`CompressionStream`) → base64url →
hash `#z=`, copié dans le presse-papier ; l'ouverture décompresse
(`DecompressionStream`) et restaure, puis nettoie le hash. Rétrocompat `#s=`
(non compressé) et repli si la compression manque. Aucune dépendance, aucun
serveur. Vérifié : F5 restaure le document ; ouvrir un lien `#z=` (après vidage
du localStorage et changement de doc) restaure exactement le document partagé.

## Distribution : déploiement du playground (GitHub Pages, sans serveur)

Première étape pour rendre HTSL intégrable par d'autres (l'outil ne vivait qu'en
local). L'architecture s'y prête déjà : `compile()` produit du HTML pur et
`installHtslRuntime()` expose `window.HTSL`, hydrate au DOMContentLoaded et charge
KaTeX/Plotly/Three à la demande. Reste à distribuer. Roadmap convenue : (1)
déployer le playground, (2) publier npm `htsl` + `@noah-medra/htsl-codemirror` + bundle CDN,
(3) CLI `npx htsl build`, (4) plugins de framework. Voir
`.docs/14-distribution-et-deploiement.md`.

Étape 1 livrée : workflow `.github/workflows/deploy-playground.yml` (npm ci →
build playground → upload-pages-artifact → deploy-pages, sur push main +
dispatch, permissions OIDC). Trivial car `vite.config.ts` utilise `base: "./"`
(chemins relatifs → marche à n'importe quelle URL, sous-chemin projet inclus,
sans toucher au code) et le build importe le moteur depuis les sources. Les liens
`#z=` (location.pathname) restent valides quel que soit l'hébergement. Procédure
de création du dépôt + activation Pages documentée dans `playground/README.md`.
Build vérifié (~225 kB gzip, libs lourdes hors bundle). Pré-requis restant côté
utilisateur : créer le remote GitHub et activer Pages (pas de remote pour l'instant).

## Distribution étape 2 : packages npm `@noah-medra/htsl-core` + `@noah-medra/htsl-codemirror` + CDN

Préparation de la publication npm. Le nom `htsl` (sans scope) est pris par un
package abandonné de 2018, et l'org `@htsl` n'est pas créable (collision avec ce
package) → publication sous le **scope personnel de l'auteur** `@noah-medra`
(= son pseudo npm, aucune org requise) : cœur **`@noah-medra/htsl-core`** et
éditeur **`@noah-medra/htsl-codemirror`**. (Itéré depuis `@htsl/core` puis
`htsl-engine` avant d'arrêter ce choix.) Détails :
`.docs/14-distribution-et-deploiement.md`.

- Renommage complet : imports source/tests, alias Vite, `paths` tsconfig,
  peer/devDeps (`@noah-medra/htsl-core: "^0.1.0"`, satisfait par le workspace local et valide
  une fois publié), dep playground.
- Métadonnées de publication sur les deux packages : `repository`/`homepage`/
  `bugs`/`author`, `publishConfig.access:"public"`, `prepublishOnly`, `files` +=
  `LICENSE` (et `dist-min` pour le cœur). Fichier `LICENSE` (MIT) ajouté (racine
  + chaque package).
- Bundle CDN auto-hydratant : `src/cdn.ts` → `dist-min/htsl.auto.global.js` (IIFE)
  qui expose `htsl_engine` ET appelle `installHtslRuntime()` au chargement
  (`window.HTSL` + hydratation des `data-htsl-*`). Variantes `htsl.global.js` /
  `htsl.min.js` conservées.
- Workflow `.github/workflows/release.yml` : `npm publish` des deux packages sur
  Release GitHub (secret `NPM_TOKEN` requis).
- Vérifié : typecheck + tests (220 + 37) verts, `build:all` OK, playground
  re-testé en navigateur (0 erreur), smoke-tests Node (compile + window.HTSL),
  `npm pack --dry-run` tarballs corrects. Reste côté user : créer l'org npm
  `htsl`, `npm login`, publier.

## Publication npm effective (2026-06-16)

`@noah-medra/htsl-core@0.1.0` et `@noah-medra/htsl-codemirror@0.1.0` publiés sur
npm (visibles via `npm view`, install OK, CDN unpkg `htsl.auto.global.js` → 200).
Blocage 2FA contourné en utilisant un **code de récupération** comme `--otp`
(les tokens Publish/granular ne bypassaient pas la 2FA du compte). Pour les
prochaines releases sans code : token Automation/Granular en secret `NPM_TOKEN`
+ workflow `release.yml`. Sécurité : tokens et codes de récup exposés pendant la
session → à révoquer/régénérer côté utilisateur.

## README racine : liens « en ligne » + nom de paquet à jour

Ajout en haut du README d'un bloc **« 🌐 Essayer / utiliser »** : playground en
ligne (https://oscarmedra.github.io/htsl_engine/), documentation, install npm
`@noah-medra/htsl-core`, snippet CDN. Correction des dernières mentions obsolètes
du cœur (`htsl` → `@noah-medra/htsl-core`) dans le tableau des paquets et l'arbre.

## Loader de rendu + éditeur masqué par défaut (playground)

Masquage du « désordre » au rafraîchissement avant hydratation. Overlay
`#render-loader` (spinner) visible par défaut dans le HTML ; `FrameRenderer`
expose `firstRender` (résolue après la 1ʳᵉ hydratation réelle — `hydrate()`
attend le chargement+dessin Plotly/Three) ; `main.ts` ajoute `.is-ready` (fondu)
à ce moment, + filet `setTimeout(8 s)`. Case « Éditeur » non cochée par défaut →
rendu plein écran au boot. Vérifié en navigateur (loader visible puis fondu,
scène dessinée, 0 erreur) ; typecheck playground OK. Détails : `.docs/13`.

## Persistance de la visibilité des panneaux (playground)

Les cases « Éditeur » et « AST » mémorisent leur état dans `localStorage`
(`htsl:ui:editor`/`htsl:ui:ast`, helpers `saveFlag`/`loadFlag`). `restorePanelPrefs()`
restaure au boot avant `relayout()` ; chaque `change` sauvegarde. Défaut premier
accès : les deux masqués. Vérifié en navigateur (cocher → refresh → reste affiché ;
décocher → reste masqué ; 0 erreur ; typecheck OK). Détails : `.docs/13`.

## Disposition responsive : panneaux empilés sur mobile/tablette (playground)

`@media (max-width: 860px)` : `#panels` passe de la grille 3 colonnes à une pile
flex verticale — **rendu en haut, éditeur en bas** (`order`), AST en dernier ;
poignées masquées ; topbar/toolbar en `flex-wrap`. Le `display:flex` neutralise
les `grid-template-columns` (desktop + inline du drag). Vérifié à 375×812 et
820×1100 (rendu au-dessus, éditeur masqué → rendu plein écran) ; desktop non
régressé ; 0 erreur. Détails : `.docs/13`.

## Toggles « Éditeur » / « AST » en switches stylés (playground)

Les cases à cocher deviennent de vrais **interrupteurs** (CSS pur) : la
`<input type=checkbox>` garde id + événements (aucune logique JS touchée), seul
son `appearance` est remplacé par une piste arrondie + knob coulissant. OFF =
gris, ON = couleur accent (knob translaté), focus-visible accessible, respect de
`prefers-reduced-motion`. Vérifié en navigateur : ON bleu / OFF gris, le clic
bascule bien le panneau correspondant ; 0 erreur console.

## Prompt IA remplacé (style « générateur de documents ») + complété

Le prompt de la page Documentation est remplacé par une version fournie par
l'utilisateur, plus pédagogique et directive (« Tu es un générateur de documents
HTSL… »). Vérification du registre : les objets `mo*`/`mc.*` du prompt existent
bien (ils ne sont juste pas listés séparément par `registry.list()`). Ajout, dans
le même style, des sections **manquantes** : graphes de fonctions `{@plot}` /
`{@plot.curve}` et **scènes 3D animées `{@s3.*}`** (Three.js, avec actions
move/rotate/scale/color/fade/transform), plus `mg2.droite` / `mg3.line` /
`mg3.segment`. Tous les exemples du prompt compilent (testé). Le prompt vit
désormais dans `playground/src/ai-prompt.txt` importé en `?raw` (évite tout
échappement des backslashes LaTeX / backticks ; `vite-env.d.ts` ajouté pour les
types). `buildPrompt()`/`objectReference()` retirés de `documentation.ts`.
Vérifié en navigateur : textarea remplie, backslashes intacts, 0 erreur.

## Fix autocomplétion : ouverture sur amorces + filtrage du {@

Régression signalée : l'autocomplétion ne s'ouvrait plus en tapant dans le
playground (seul le slash marchait). Deux causes :

1. **Ouverture auto** : les versions récentes de `@codemirror/autocomplete`
   n'auto-activent plus sur des amorces à caractères non-mot (`{@`). Fix
   (`playground/src/main.ts`) : l'`updateListener` appelle explicitement
   `startCompletion` sur une vraie saisie quand le texte avant le curseur matche
   `{@…`, `{$…`, `{!…`, `[…` ou `/…` (comme le faisait déjà le slash). Gardé sur
   `isUserEvent("input")` → jamais sur une édition programmatique.
2. **Filtrage de `{@`** (bug isolé dans `packages/codemirror/src/completion.ts`) :
   la branche `{@` renvoyait `from = position du {`, donc CodeMirror filtrait les
   labels (`mti`…) contre `{@m` → 0 résultat. Corrigé en renvoyant `from = après
   {@` (filtre sur le nom seul) avec un `apply` qui remplace depuis le `{@` — même
   schéma que le slash. L'`apply` avale aussi le `}` auto-inséré par `closeBrackets`
   pour éviter un `}` en trop (`{@mti: formule}` propre).

Vérifié en navigateur : `{@`→96 objets, `{@mt`→21 filtrés, accepter `{@mti`→
`{@mti: formule}` (sans double brace), `[`→attributs filtrés. Tests codemirror
37/37 (test du `from` mis à jour : 0 → 2), typecheck OK, 0 erreur console.

## Éditeur flottant repassé en opaque (fin de la translucidité)

La translucidité de l'éditeur de bloc (fond `rgba(...,.22)` + `backdrop-filter:
blur` + ombre de texte pour la lisibilité) gênait la lecture. Repassé en
**opaque/normal** : `background: var(--panel)`, bordure 1px accent, ombre portée,
plus de flou ni d'ombre de texte ; surfaces CodeMirror sur fond blanc, barre
d'aide en gris clair neutre. Vérifié en navigateur (double-clic composant) :
fond `rgb(255,255,255)`, `backdrop-filter: none`, texte net ; 0 erreur console.

## Objets mathématiques manquants implémentés (vecteur, matrice, complexe, ensemble, intervalle, constantes)

La doc/prompt annonçait des objets `mo*`/`mc.*` qui **ne rendaient rien de
correct** (seuls `mof` et `mc.pi` existaient ; les autres fuyaient leur texte ou
rendaient vide). Implémentés dans le cœur (registre + `latexOfObject`) :

- **mov** (vecteur colonne) → `\begin{pmatrix} … \end{pmatrix}` (enfants `{c:…}`).
- **mom** (matrice) → `pmatrix`, cellules de `{row:a,b}` séparées par `,` → `&`.
- **moc** (complexe) → `a + bi` avec gestion du signe et de l'unité (im=±1, re=0…).
- **mos** (ensemble) → `\left\{ … \right\}`.
- **moi** (intervalle) → bornes `[ ]`/`] [` selon `open` (none|left|right|both).
- **mc.e / mc.inf / mc.phi / mc.i** → `e`, `\infty`, `\varphi`, `i`.

Les alias plats (`mov`…`moi`) + alias de collection (`mc.e`…) résolvent comme
prévu. Le catalogue de la doc et le prompt IA se génèrent depuis le registre →
désormais **exacts**. Tests : core **226** (6 nouveaux). KaTeX rend tout sans
erreur (vérifié en navigateur : vecteur colonne, matrice 2×2, 3−2i, {1,2,3},
[0,1[, ½·π, e/∞/φ/i). 0 erreur console.

## Objet @slide : présentations navigables (runtime, zéro JS depuis le contenu)

Nouveau tag `{@slide: {section:…} {section:…}}` : un diaporama dont chaque
`{section:…}` est un slide, avec boutons ⟵/⟶, flèches clavier, plein écran,
compteur et barre de progression. La navigation est gérée par le **runtime du
moteur** (objet de première classe, comme Plotly/Three) → le contenu n'émet
jamais de `<script>`, le modèle « zéro JS depuis le contenu » est préservé.
Détails : `.docs/15-presentations-slide.md`.

- Registre `slide.deck` (alias `slide`, cat. structure) → visible au catalogue +
  prompt IA. `objects/slides.ts` (isSlidePath). Renderer : méthode `slides()`
  (nœud `data-htsl-slides`, ne garde que les `section`). `slides-client.ts` :
  `hydrateSlides` (listeners globaux installés une fois, état dans
  `data-htsl-index` → morph-safe, pur DOM). CSS dans `mathCss` (carte, fondu,
  dégradation gracieuse sans runtime, `@media print` = 1 slide/page).
- Tests cœur 231 (+5). Vérifié en navigateur : nav boutons + clavier, compteur,
  barre, boutons désactivés aux bornes ; 0 erreur console ; typecheck OK.

## Renommage @slide → @slider (+ slides internes en @slider.slide)

Sur demande, le tag de présentation est renommé : conteneur `{@slide}` → **`{@slider}`**
et chaque slide `{section:…}` → **`{@slider.slide:…}`** (collection `slider`,
cohérent avec mg2/s3). Registre : `slider.deck` (alias `slider`) + `slider.slide`.
`objects/slides.ts` : `SLIDER_DECK_PATH`/`SLIDER_SLIDE_PATH`. Renderer : la
méthode `slides()` collecte désormais les enfants objets `slider.slide` (et rend
un `{@slider.slide:}` isolé comme `<section>`). CSS + runtime **inchangés** (ils
ciblent `.htsl-deck` / `<section>`). Tests, prompt IA et `.docs/15` mis à jour.
Core 231 verts, typecheck OK, navigation revérifiée en navigateur (1/3 → 2/3).

## Doc playground : section dédiée « Présentations »

Ajout d'une section `#slides` (+ entrée de nav sous « Visualiser ») dans
`documentation.html` expliquant `{@slider:}` / `{@slider.slide:}` (boutons,
clavier, plein écran, PDF 1 slide/page, dégradation gracieuse). Le catalogue
auto liste déjà `slider.deck`/`slider.slide`. Vérifié en navigateur (nav,
section, bouton Copier, catalogue) ; 0 erreur.

## Lot 1 « pédagogie » : encadrés sémantiques (@theorem, @definition, @proof…)

Premier lot de la feuille de route pédagogique : des encadrés stylés et
auto-numérotés (équivalent amsthm). 7 types (théorème/définition/propriété/
exemple numérotés ; démonstration/remarque/attention non), alias FR, attributs
title + label, renvoi cliquable `{@ref[to=…]/}`. Détails : `.docs/16`.

- `objects/callout.ts` : `CALLOUT_TYPES`, `buildCalloutContext` (numérotation
  par type + labels, renvois en avant). Registre : 7 encadrés (cat. document) +
  `callout.ref` enregistrés par boucle. Renderer : `callout()`/`calloutRef()`
  (pur HTML, aucun JS), encadré labellisé = ancre `id`. CSS par type dans
  `mathCss` (bordure + en-tête teinté, ∎ pour proof, break-inside print).
- Prompt IA + doc playground (section #callouts) + catalogue (auto) à jour.
- Tests cœur 239 (+8). Vérifié en navigateur (5 encadrés, KaTeX dedans, renvoi
  cliquable) ; typecheck OK ; 0 erreur console.

## Lot 2 « pédagogie » : @reveal (correction cachée) + @tabs (onglets)

Workflow exercice corrigé. `{@reveal[title=…, open=]}` = `<details>` natif (zéro
JS). `{@tabs:}` + `{@tabs.tab[title=…]:}` = onglets hydratés par le runtime
(`tabs-client.ts`, listener unique/fenêtre, index dans `data-htsl-tab`,
morph-safe). Détails : `.docs/17`.

- Registre : reveal (alias solution/spoiler), tabs, tabs.tab (cat. structure).
  Renderer : reveal()/tabsBlock()/tabsTab() + helper childrenHtml(). Runtime :
  hydrateTabs branché dans hydrate()+purge(). CSS (mathCss) : `<summary>` ▸/▾,
  barre d'onglets (actif souligné), dégradation gracieuse + print.
- Prompt IA + doc (#interactive) + catalogue (auto) à jour.
- Tests cœur 243 (+4). Vérifié en navigateur : bascule d'onglets au clic + KaTeX
  dans les panneaux, `<details>` ouvrable ; typecheck OK ; 0 erreur console.

## Lot 3 « pédagogie » : @quiz (QCM) + @flashcard

Auto-évaluation. `{@quiz:}` ({q}/{opt}/{opt[correct=true]}/{explain}) gradé par le
runtime (✓/✗ + révélation + explication, verrouillé). `{@flashcard:}`
({front}/{back}) = retournement 100% CSS (checkbox+label+rotateY 3D, id unique
par compteur renderer). Détails : `.docs/18`.

- Registre : quiz (alias qcm) + flashcard (alias carte). Renderer : quiz()/
  flashcard() + helpers els()/elementBody(). Runtime : quiz-client.ts (hydrateQuiz,
  listener unique/fenêtre, état data-htsl-answered) ; flashcard sans runtime. CSS
  (mathCss) : options ✓/✗, explication, carte 3D + print.
- Booléen sans valeur non supporté → `[correct=true]`. Prompt IA + doc (#quiz) +
  catalogue (auto) à jour.
- Tests cœur 247 (+4). Vérifié en navigateur (graduation quiz, flip flashcard
  verso au-dessus) ; typecheck OK ; 0 erreur console.

## Lot 4 « pédagogie » : @chart (graphiques de données, Plotly)

`{@chart[type="bar|pie|line|histogram", title…]: {pt[x=…, y=…]/} …}` (histogramme
via `values="a,b,c"`). Réutilise la voie Plotly déclarative (`objects/chart.ts` :
`renderChart` → figure `{data,layout}` → nœud `data-htsl-scene` dessiné par
`hydrateScenes`). Aucun nouveau runtime. Détails : `.docs/19`.
- Registre : objet `chart` (alias graphique, cat. géométrie) ; `pt` = élément.
  Renderer : dispatch après `@plot`. Bar = couleur/catégorie, pie = labels+%,
  line = scatter, histogram = nbinsx.
- Tests cœur 253 (+6 ; bug de test `spec(src)`→`spec(compile(src))` corrigé).
  Vérifié en navigateur (barres + camembert avec % + histogramme dessinés) ;
  typecheck OK ; 0 erreur console. Prompt IA + doc (#charts) + catalogue (auto).

## Lot 5 « pédagogie » : @variations + @signs (tableaux français)

Le tableau de variations et le tableau de signes (différenciateur unique au
lycée/prépa). `{@variations[var, fn]: {pt[x, y]/} {up|down/} …}` (positions
haut/bas déduites des flèches) ; `{@signs: {pt[x]/} {pt[x, zero=true]/} {s:+|-} …}`.
Rendu = grille CSS pure, valeurs en KaTeX (`inlineMath` exporté de math.ts).
Détails : `.docs/20`.

- `objects/variations.ts` (isVariationsPath, renderVariations/renderSigns,
  collect()). Renderer : dispatch avec this.options.katex. Registre : variations
  + signs (cat. formules) ; pt/up/down/s = éléments. CSS (mathCss) : grille,
  alignement top/bottom, flèches ↗↘.
- Booléen sans valeur → `zero=true`. Prompt IA + doc (#tables) + catalogue (auto).
- Tests cœur 257 (+4). Vérifié en navigateur (variations de x²-2x, signes de
  2x-2, 13 KaTeX) ; typecheck OK ; 0 erreur console.
