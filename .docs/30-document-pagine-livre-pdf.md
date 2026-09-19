# Document paginé `{@document}` / `{@page}` — livre & PDF propre

## Problème

À l'impression PDF, certains composants se **cachaient** (contenu replié dans des
`<details>` : steppers guidés, solutions d'exercices, `{@reveal}`) et il n'existait
aucune notion de **page** pour rédiger un document long / un livre.

## Solution : un couple parent/enfant, comme le slider

- **`{@document}`** (parent) : conteneur paginé. Attributs :
  - `format` = `a4` (défaut) | `letter` | `a5` — dimensions de la feuille à l'écran.
  - `numbers` = booléen — numéro de page (bas de page, écran).
  - `mode` = `flow` (défaut, feuilles empilées) | `book` (lecture feuilletée).
- **`{@page}`** (enfant, alias `page` / `feuille`) : une feuille où l'on écrit
  librement. Numérotée automatiquement (`data-htsl-page`).
- Alias du parent : `livre`, `pages`.

Enregistrés dans `registry.ts` (catégorie `document`), rendus dans `renderer.ts`
(`pagedDoc`, `docPage`, helper `docFormat`).

## La pagination « intelligente » est native

Demande initiale : « quand le texte déborde, le composant doit se dupliquer en deux
pour que tout apparaisse ». **C'est le comportement natif de l'impression** : une
`{@page}` reçoit `break-before: page` (démarre sur une feuille neuve) mais **sans
hauteur bloquée** (`min-height`, pas `height`) et `break-inside: auto`. Quand son
contenu dépasse une feuille physique, le moteur d'impression le **poursuit tout seul**
sur la feuille suivante. Rien n'est coupé — zéro JS.

À l'**écran**, chaque page est une feuille blanche (ombre, marges) en `min-height`
qui **grandit** avec son contenu : rien n'est coupé non plus.

## Composants cachés → révélés à l'impression

Le CSS seul ne suffit pas (Chrome masque le contenu d'un `<details>` fermé dans le
shadow DOM). Le **runtime de confiance** (`runtime.ts`, `wirePrint`, câblé une fois
par fenêtre) écoute `beforeprint` : il ouvre tous les `<details:not([open]))`, puis
les restaure sur `afterprint`. Marche aussi dans l'iframe du playground (les
événements d'impression de la frame se déclenchent).

## Mode livre (`mode=book`) — feuilleter comme un vrai livre

Nouveau runtime `book-client.ts` (calqué sur `slides-client`, sans autoplay) :
- état dans `data-htsl-book-index` (survit au morphdom) ;
- une seule page visible (`.is-current`), flèches ‹/› + touches ←/→, compteur ;
- animation de tourne-page 3D (`rotateY`, origine = reliure) via une classe
  transitoire `.htsl-book-turn-next/-prev` posée **uniquement sur un vrai
  changement** (jamais au re-render → pas de « bruit » à la frappe) ;
- respect de `prefers-reduced-motion`.
Exporté depuis `index.ts` (`hydrateBooks`, `pendingBooks`, `purgeBooks`) et hydraté
dans `runtime.ts`. À l'impression, la nav est masquée et **toutes** les pages
réapparaissent (une par feuille).

## Bouton « ⬇ PDF » dans le composant

Le renderer place un `<button data-htsl-pdf>` (flottant, coin haut-droit, masqué à
l'impression). Le runtime (`wirePrint`) l'écoute : il fixe le titre du document sur
le premier titre (nom du fichier PDF), puis appelle `window.print()` de la fenêtre
du document — **uniquement le document** est imprimé.

**Réalité navigateur** : aucun site web ne peut écrire silencieusement un PDF sur le
disque (verrou de sécurité). Le seul vrai PDF de qualité (texte vectoriel
sélectionnable, vraies pages) passe par la boîte d'impression → « Enregistrer au
format PDF ». Le bouton déclenche exactement ce chemin, proprement. Rasteriser la
page en images (téléchargement « un clic ») donnerait un texte flou non
sélectionnable — écarté pour un livre.

## CSS

`css.ts` : `.htsl-doc`, `.htsl-doc-page` (feuilles a4/letter/a5, numéros), bloc
`@media print` (feuille neuve, débordement continué, `.htsl-doc-pdf` masqué), mode
livre (`.htsl-doc--book`, `.htsl-book-stage`, tourne-page, nav) + `@media print`
livre (nav masquée, toutes pages visibles). Aucun backtick dans les commentaires CSS.

## Tests

`tests/paged-document.test.ts` (10) : structure feuilles + numéros + formats +
fallback a4 + enfants non-page ignorés + alias + `{@page}` seule + bouton PDF +
échafaudage mode livre + absence d'échafaudage en flow. Suite : core 356,
codemirror 37 (395 au total), 0 erreur console.

## Exemple

```
{@document[mode=book, numbers=true]:
  {@page: {h1:Chapitre 1} {p:Le début…}}
  {@page: {h1:Chapitre 2} {p:La suite…}}
}
```

## Options en-tête / pied de page / cadrillage (héritées + surchargeables)

Ajout d'options qui **ne vivent que dans le contexte `{@document}`** (comme
slider/slide, `{@page}` se rend gracieusement seul mais sans ces options) :

- Sur **`{@document}`** (défauts pour toutes les pages) : `grid`
  (`none`|`lines`|`squares`|`dots`, alias `grille`→squares, `lignes`→lines),
  `header` (en-tête courant), `footer` (pied courant).
- Sur **`{@page}`** : mêmes attributs `grid`/`header`/`footer` qui **surchargent**
  le document pour cette page.

Rendu (`docPage`) : la page devient `header? + .htsl-doc-content + footer?`. Type
`PageOptions` + helper `docGrid` (renderer.ts). Le numéro de page (`numbers`) migre
du `::after` vers le **pied** (à droite, `.htsl-doc-num`). La feuille est un
`flex column` avec `.htsl-doc-content { flex:1 }` → le pied colle en bas d'une page
courte (vérifié : footerTop 1021 / 1123px A4).

Cadrillage = fond CSS (`repeating-linear-gradient` / `radial-gradient` sur
`.htsl-doc-content`). **Limites honnêtes** : (1) le cadrillage ne s'imprime que si
« Graphiques d'arrière-plan » est coché ; (2) l'en-tête/pied s'affiche une fois par
`{@page}` logique — si une page déborde sur 2 feuilles physiques, il ne se répète pas
(les en-têtes par feuille physique exigeraient `@page`, sans HTML libre). Pour la
rédaction d'un livre (une page écrite ≈ une feuille), c'est un vrai en-tête/pied
courant. `@page { margin: 16mm }` ajouté à l'impression pour de vraies marges.

Tests étendus : `paged-document.test.ts` passe de 10 à 14 (grid/header/footer doc +
surcharge page + numéro dans le pied + alias grille/lignes + options inertes hors
document). Core 360, codemirror 37 (400 au total).

## Correctif : le texte repose sur les lignes du cadrillage

Remarque utilisateur : avec `grid=lines`, le texte flottait entre les lignes (corps
de texte à 25,6px d'interligne vs pas du cadrillage à 28px → dérive). Correctif :
une variable partagée `--htsl-rule` (28px) pilote **à la fois** le dégradé du fond
**et** la hauteur de ligne du contenu (`line-height: var(--htsl-rule)`), plus des
marges de bloc d'un interligne (`margin: 0 0 var(--htsl-rule)`) et des titres sur
2 interlignes (`line-height: calc(var(--htsl-rule) * 2)`). Résultat : le corps de
texte repose sur les lignes et les paragraphes sont séparés d'un interligne pile
(vérifié navigateur : line-height = margin = 28px). Limite subsistante : math /
images / titres de hauteur atypique peuvent encore dériver — le cadrillage reste un
guide, pas une contrainte stricte pour tout contenu.

## Correctif mode livre : pied ancré en bas (révélé en testant le cadrillage)

En testant `grid` en `mode=book`, un bug est apparu : la règle
`.htsl-doc--book …-page.is-current { display: block }` **écrasait** le
`display: flex` de base de `.htsl-doc-page` → le contenu ne s'étirait plus et le pied
(+ numéro) remontait sous le texte au lieu du bas de la feuille (footerTop 264 au lieu
de ~1025). En mode flow le problème n'existait pas (pas d'écrasement). Correctif :
la page courante (et le fallback pré-hydratation) passent en `display: flex`, ce qui
préserve la colonne flex → pied ancré en bas (vérifié : pageH 1123, footerTop 1025,
marge 76px = padding 20mm), cadrillage sur toute la hauteur. (NB : bug des backticks
dans un commentaire CSS rencontré une 4e fois lors de ce correctif, corrigé.)

## Correctif impression : la grille remplit toute la feuille du PDF

À l'export PDF, le cadrillage s'arrêtait après le texte (le reste de la feuille
restait blanc) alors qu'à l'écran il remplissait la page. Cause : le bloc `@media
print` mettait `.htsl-doc-page { min-height: 0; padding: 0 }` → la feuille se
réduisait à la hauteur du contenu (le flex ne pouvait plus s'étirer). Correctif :
`@page { margin: 0 }` (les bords de la feuille = bords du papier, le padding 20mm de
la page fait la marge de texte) + en impression `.htsl-doc-page { width: 100% }` et
une `min-height` par format ~1mm sous la feuille (296mm A4 / 278 letter / 209 a5) pour
que le contenu flex et la grille atteignent le bas sans déborder sur une feuille
blanche. Mode livre : la page courante passe en `display: flex !important` à
l'impression (au lieu de block) pour le même remplissage. Vérifié à l'écran : page
1123px (A4), contenu flex étiré à 879px, grille jusqu'en bas.
