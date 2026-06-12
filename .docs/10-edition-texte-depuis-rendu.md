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
