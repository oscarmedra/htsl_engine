# Numérotation par chapitre & renvois (retours C1 / C2)

## C1 — numérotation par chapitre

Option de rendu `chapterNumbering` (défaut false). Quand elle est active, chaque `{h1}`
ouvre un **nouveau chapitre** : les compteurs d'encadrés numérotés (théorème,
définition, propriété, exemple…) sont remis à zéro et le numéro devient
`<chapitre>.<n>` — « Théorème 18.3 », convention des livres. Avant le premier `{h1}`
(chapitre 0), la numérotation reste simple.

Implémenté dans `buildCalloutContext(nodes, chapterNumbering)` (callout.ts) : le type
de `number` passe de `number` à `string` ("18.3"). Threadé depuis `RenderOptions`
(`renderer.renderTop`). CLI : `htsl render fichier.htsl --chapters` (idem `htsl pdf`).

## C2 — renvois automatiques

Déjà disponible et confirmé : on étiquette un encadré avec `label=…` et on y renvoie
avec `{@ref[to=label]/}`, qui affiche le bon numéro (y compris par chapitre) et un
lien. Un renvoi cassé → `(réf. ?)` en rouge.

```
{h1:Mesures}
{@theorem[label=caratheodory]: …}
{p:D'après {@ref[to=caratheodory]/}, …}   → « Théorème 1.1 » cliquable
```

Tests : `chapter-numbering.test.ts` (global, par chapitre, ref, ref cassée). Suite 444.
