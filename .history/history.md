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
- `@htsl/codemirror` : `htslCompletion` insère les snippets (`snippet()` de CodeMirror, trous au Tab) après `{@` ; **commande slash** `/` en début de ligne (objets + HTML + composants), filtre après le `/`, insertion remplaçant le `/`. 25 tests.
- Playground : **palette** drawer (➕), groupée par catégorie, recherche, aperçus rendus compilés (cachés), clic = insertion du snippet ; **aide contextuelle** sous l'éditeur (describe() de l'objet au curseur : description + tableau d'attributs). Déclenchement slash via `startCompletion`.
- Bug corrigé : le `from` du slash incluait le `/` → CM filtrait sur « /x » contre des labels sans `/` (tout exclu) ; corrigé (filtre après le `/`, apply depuis le `/`).
- Test cible vérifié en navigateur : titre + équation numérotée (1) + scène 3D construits **à la souris** (clics palette) → rendu correct.
- Syntaxe du langage inchangée. `.docs/11-couche-authoring.md` ajouté.

### Palette retravaillée (retour utilisateur)

- **Conteneurs regroupés en tête** : composants définis par l'utilisateur (lus à chaque ouverture via `registry.components(parse(doc))`) + scènes 2D/3D, séparés des objets simples. Ordre : Conteneurs, Structure, Formules, Équations, Géométrie (acteurs, scènes exclues).
- **Aperçus en texte** au lieu de formules rendues : `compile(example)` sans KaTeX → texte du rendu (maths en LaTeX source), plus léger/clair ; scènes = « 🧊 Graphique interactif ». KaTeX retiré de la palette.
- **Description lisible en avant**, chemin technique discret (l'éditeur est pour les power users).
- **Contenu tampon à l'insertion** : scènes pré-remplies d'un acteur (cercle/point 2D, sphère 3D) ; composants remplis de `Contenu du conteneur.` et leurs paramètres sans défaut prennent leur nom comme valeur → HTSL valide qui **rend immédiatement** (plus d'attribut vide malformé `name=`). Snippets de scène mis à jour dans le cœur ; `componentSnippet` (palette + @htsl/codemirror) corrigé.
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

- Le textarea d'édition de bloc devient un **véritable éditeur CodeMirror HTSL** (`playground/src/block-editor.ts`) : coloration syntaxique, autocomplétion (`{@`, `/`, attributs) et linter — les mêmes extensions que l'éditeur principal via `@htsl/codemirror`. Objectif : tout faire depuis le rendu (l'éditeur principal devient optionnel).
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
- `@htsl/codemirror` : ajout d'`indent` au parser (profondeur = nb de frames d'accolades ouvertes × `unit` ; une ligne commençant par `}` se désindente d'un niveau) + `languageData.indentOnInput = /^\s*\}$/` (réindente en tapant `}`). 4 tests via `getIndentation` (1 bloc → 2, imbriqué → 4, `}` → 0, racine → 0). codemirror **29** tests.
- Playground : `indentWithTab` ajouté au keymap de l'éditeur principal **et** de l'éditeur de bloc (Tab indente, Shift-Tab désindente).
- Vérifié en navigateur : `{ul:` + Entrée → `{ul:\n  ` ; Tab sur une ligne → `  …`.




## Texte brut `{script:…}` / `{style:…}` + exécution des scripts inline (retour utilisateur)

Le moteur cassait sur du JS dans `{script:…}` (les `{`/`}` étaient parsés comme du HTSL) et CodeMirror ne colorait pas le JS.

- **Moteur** : nouvelle frame lexer `raw` pour les balises `script`/`style` (RAW_TEXT_TAGS). Le corps est lu **verbatim** jusqu'au `}` qui équilibre l'ouvrante (comptage d'accolades en ignorant chaînes, gabarits `` `…` `` et commentaires `//` `/* */`). Le renderer émet ce corps **sans échappement** (`rawTextOf`). 7 tests (`tests/raw-text.test.ts`). Core **191**.
- **@htsl/codemirror** : frame `raw` (lang js/css) dans le StreamLanguage → coloration JS (mots-clés, nombres, chaînes, commentaires, gabarits multi-lignes via l'état), CSS minimal ; comptage d'accolades pour reprendre le HTSL après le `}`. Tags `keyword`/`number` ajoutés. 4 tests. codemirror **33**.
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
