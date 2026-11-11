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
