# 10 — Édition du texte depuis le rendu

## Objectif

Permettre de corriger **le texte** directement dans le panneau de rendu (utile
pour un prof qui ajuste un énoncé), avec réécriture dans le source HTSL. Seuls
les **textes** sont éditables (ni les formules, ni la structure).

## Cœur (packages/core, opt-in, avec tests)

- **Plages source** : le lexer enregistre `start`/`end` (offsets absolus) sur les
  jetons TEXT. `parse(src, { ranges: true })` attache `range: [start, end]` aux
  nœuds texte (off par défaut → AST inchangé). La plage couvre le texte *brut*
  (échappements compris).
- **Rendu éditable** : `render(ast, { editableText: true })` enveloppe chaque
  texte adossé au source dans
  `<span class="htsl-edit" data-htsl-text="start-end">…</span>`. Les textes
  issus de variables (`{$x}`) n'ont pas de plage → non éditables ; le contenu
  math n'est pas enveloppé.
- Tests (`tests/editable.test.ts`, 7) : plages = sous-chaîne brute exacte,
  off par défaut, spans avec offsets corrects, pas de span pour variables/math.

## Playground

- `run()` parse avec `ranges: true` et rend avec `editableText: true`.
- `FrameRenderer` rend les spans `contenteditable="plaintext-only"` et écoute
  `focusout` (délégué). **Subtilité corrigée** : `instanceof Element` échoue à
  travers la frontière de l'iframe (réalmes différents) → test par duck-typing.
- À la perte de focus, le texte édité est **réécrit dans le source** : les
  caractères spéciaux HTSL (`{ } : $`) sont ré-échappés, puis
  `source[start:end]` est remplacé et un rendu immédiat rafraîchit les offsets.
- Affordance : survol = halo bleu, focus = surlignage ambre.

## Vérifié en navigateur

Éditer « Galerie de formules » → le source devient `…]:Titre modifié au rendu}`.
Saisir `Prix: {remise} $5` → source échappé `Prix\: \{remise\} \$5`, rendu
littéral correct. Les équations et références ne sont pas éditables.

## Garanties

Syntaxe du langage inchangée ; `ranges`/`editableText` sont opt-in. Tests : core
**174** (7 nouveaux), codemirror 21.

## Limite

Un antislash littéral dans le texte n'est pas ré-échappé (cas rare en prose) ;
le reste (`{ } : $`) l'est.

## Extension : édition d'un **élément** entier depuis le rendu

Le texte se corrige sans syntaxe ; pour changer la **structure** d'un bloc, on
peut désormais cliquer l'élément lui-même.

- **Plages d'éléments/objets** : le lexer porte des offsets absolus sur *tous*
  les jetons `{`, `{@`, `}` (plus seulement TEXT). Le parser attache
  `range: [début, fin]` aux nœuds `element`/`object` (sous `ranges: true`),
  couvrant tout le `{…}`. L'expansion préserve la plage des éléments réellement
  écrits ; pour un **composant**, les plages internes (du template) sont retirées
  et la plage de l'**appel** `{@…}` est exposée sur la racine de l'instance, afin
  qu'éditer un composant édite son usage, pas son modèle.
- **Rendu** : `render(ast, { editableText: true })` émet
  `data-htsl-range="début-fin"` sur les éléments.
- **Playground** : survol d'un élément (hors texte) = halo bleu ; clic = un
  **véritable éditeur CodeMirror HTSL** s'ouvre en superposition sur l'élément,
  pré-rempli avec la **source HTSL** du bloc. Il a **la même expérience que
  l'éditeur principal** : coloration syntaxique, autocomplétion (`{@`, `/`,
  attributs…) et linter, via `@htsl/codemirror` (`playground/src/block-editor.ts`).
  `⌘/Ctrl + Entrée` (ou perte de focus) valide → `source[début:fin]` est remplacé
  tel quel (HTSL brut, pas de ré-échappement) puis re-rendu ; `Échap` annule.
  L'objectif est de pouvoir **tout faire depuis le rendu** (l'éditeur principal
  devient optionnel). Détails : l'éditeur est monté dans le document parent (où
  CodeMirror fonctionne déjà) puis positionné via l'offset de l'iframe ; ses
  popups sont rendus dans `<body>` (`tooltips({ parent })`) pour échapper à
  l'`overflow:hidden`. Le clic sur un **texte** garde l'édition de texte simple
  (les deux modes cohabitent : texte = sans syntaxe, élément = source du bloc).
- **Translucide** : l'overlay est semi-transparent + flou d'arrière-plan
  (`background: rgba(...,.55)` + `backdrop-filter: blur`) et ne masque pas
  l'élément rendu — le **rendu reste visible dessous pendant l'édition** (utile
  quand une audience suit le rendu pendant que quelqu'un édite). L'éditeur
  principal (le fichier) n'est jamais couvert (l'overlay est sur le panneau de
  rendu) : cliquer dedans valide l'overlay et rend la main sur le fichier — on
  peut donc éditer indifféremment depuis le rendu **ou** depuis le fichier.
- Tests (`tests/editable.test.ts`) : plage = `{…}`/`{@…/}` exact, absente par
  défaut, et instance de composant exposant l'appel (une seule plage).

Vérifié en navigateur : cliquer un `{h1:…}` → l'éditer en `{h1.vedette:Titre
modifié}` met à jour classe + texte ; cliquer une instance de composant ouvre
`{@carte[titre=Salut]: Corps.}` ; `Échap` annule sans réécrire.
