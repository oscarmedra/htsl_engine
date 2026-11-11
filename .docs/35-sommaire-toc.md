# Sommaire automatique `{@toc}` (retour B2)

`{@toc[levels=3, title="Sommaire"]/}` génère un sommaire à partir des titres
`{h1}`…`{h6}` du document, avec un **lien** vers chacun. Alias `{@sommaire}`.

- `levels` : profondeur max (1–6, défaut 3).
- `title` : titre affiché au-dessus (optionnel).

Implémentation : `objects/toc.ts` — `buildTocContext(nodes)` collecte les titres dans
l'ordre, leur attribue un **slug** unique (accents retirés, doublons suffixés `-2`),
et n'agit **que si** un `{@toc}` est présent (sinon sortie inchangée). Le renderer
estampille l'`id` sur chaque titre (sans écraser un `id` d'auteur) et `renderToc`
produit `<nav class="htsl-toc">` avec une liste indentée par niveau.

**Limite honnête** : pas de **numéros de page réels** — ceux-ci dépendent de la
pagination que le navigateur ne calcule qu'à l'impression. Les liens sautent au titre.

Tests : `toc.test.ts` (niveaux, ancres, cap, pas d'injection sans toc, slugs uniques).
Suite 449.

## B1 (gains rapides) — saut de page & titres non orphelins

- `{@pagebreak/}` (alias `{@saut/}`) : saut de page forcé à l'impression/PDF, invisible
  à l'écran (`.htsl-pagebreak { break-after: page }`).
- `@media print { h1…h6 { break-after: avoid; break-inside: avoid } }` dans le core →
  un titre n'est jamais laissé seul en bas d'une page (même en export autonome).

La **pagination automatique mesurée** (couper un tableau/une liste entre deux pages)
reste le gros chantier non traité (nécessite une mesure JS façon paged.js).
