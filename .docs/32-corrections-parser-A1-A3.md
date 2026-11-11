# Corrections d'analyse (retours utilisateurs A1–A3)

Suite aux retours des utilisateurs produisant de longs manuels, trois bugs d'analyse
qui corrompaient les fichiers ont été corrigés.

## A1 — espace supprimé entre éléments inline

`{p:la norme $x$ {strong:importante}}` s'affichait « $x$importante » (collé).
Cause : `parser.collect()` supprimait **tout** nœud texte 100 % blanc, y compris les
séparateurs de mots entre deux éléments inline. Fix : le blanc **entre** deux frères
est conservé (séparateur significatif, comme en HTML) ; seul le blanc de **début**
(collect) et de **fin** (`trimEdge`) est retiré. Côté rendu, le mode « pretty » (bloc)
ignore le blanc (les sauts de ligne séparent déjà), le mode « compact » (inline) le
garde → l'espace réapparaît.

## A2 — apostrophe dans un bloc de code / un attribut

`{@codeblock:# l'exemple}` cassait (« balise jamais fermée ») car `lexRaw` traitait
`'`/`"`/commentaires comme en JS/CSS. Fix : cette intelligence est réservée à
`{style}`/`{script}` (vrai code, chaînes équilibrées) ; pour `{@codeblock}` (langage
quelconque, prose française) on ne compte que les accolades → l'apostrophe reste
littérale. De plus, les **guillemets simples** sont acceptés pour les valeurs
d'attribut (`title='…'`), en plus des doubles.

## A3 — accolade à l'intérieur d'une formule

`$x}$` / `$A}$` cassaient : `lexMath` fermait le bloc sur `}` au niveau 0. Fix : seule
une formule délimitée par accolades (`{@mtb:…}`) se ferme sur `}` ; dans `$…$` / `$$…$$`
un `}` est du LaTeX littéral (la fermeture est le `$`).

Tests : `inline-whitespace.test.ts` (A1×4, A2×4, A3×2) + `parser.test.ts` mis à jour.

## A4 / A5 — diagnostic statique (`diagnose()`)

Nouvelle fonction `diagnose(source, { katex? })` → `Diagnostic[]` (ligne, col, message,
extrait, suggestion), exportée depuis `index.ts`. Ne lève jamais. Base pour `htsl check`
et le signalement d'erreurs de l'éditeur.
- **A4** : objet inconnu `{@table}` → « objet inconnu {@table} » + suggestion
  `{table} (élément, sans @)` si c'est un élément connu, sinon l'objet le plus proche
  (distance d'édition ≤ 2, ex. `{@truthtabl}` → `{@truthtable}`). Les composants
  `{!define}` et les objets du registre ne sont pas signalés.
- **A5** : si un `katex` est fourni, chaque formule est validée (`throwOnError`) → erreur
  « formule invalide : <message KaTeX> » avec la bonne ligne/colonne.
- Erreurs de syntaxe récupérées par le parseur tolérant également remontées.

Tests : `diagnose.test.ts` (A4×5, A5×4). Suite : 431.

## D1 / D2 — contenus larges (tableaux, formules)

Les `<table>` (y compris `{@truthtable}`) sont désormais enveloppés par le renderer
dans `<div class="htsl-scroll-x">` → **défilement horizontal** quand c'est plus large
que la page/l'écran (et sur mobile), au lieu de déborder. `.katex-display` et
`.htsl-math-block` (déjà) scrollent aussi. En impression, le défilement redevient
`visible` (rien n'est coupé). Tests `wide-content.test.ts`.

## E3 — schéma JSON de référence des objets

`objectsSchema()` (exporté) renvoie **tout** le registre, sérialisable en JSON : chaque
objet/élément avec alias, content model, catégorie, **schéma d'attributs** (type,
requis, défaut, valeurs, description), snippet et exemple minimal. Pour outils, doc de
référence et assistants IA. Fichier généré : `packages/core/schema/htsl-objects.schema.json`
(125 entrées) via `npm run -w @noah-medra/htsl-core schema`. Tests `schema.test.ts`.
Suite : 437.
