# 11 — Couche d'authoring (réduire la marche d'apprentissage)

Principe : **tout est généré depuis l'API d'introspection** (`registry.list` /
`describe`). Aucune liste d'éléments codée en dur.

## 1. Métadonnées (packages/core, avec tests)

Le registre gagne deux champs : `snippet` (template d'insertion avec marqueurs
de trous CodeMirror, ex. `{@mte[label=${1:label}]: ${2:formule}}`) et `category`
(`structure | formules | géométrie | document`). Un champ `kind`
(`object | element`) distingue les `@`-objets des **balises HTML courantes**
(h1, p, ul, table, a, img…), désormais enregistrées et introspectables **sans
affecter le langage** (le lexer/parser ne consultent que les `kind:"object"`).

Renseigné pour toutes les collections + ~18 balises HTML. `registry.list()`
renvoie `path/aliases/kind/category/description/snippet/example`. Tests
(`introspect.test.ts`) : chaque entrée a un snippet + une catégorie valide,
les éléments HTML sont `kind:"element"` et `isKnownObject` reste faux pour eux,
chaque exemple **compile** (les aperçus de la palette ne lèvent jamais).

## 2. Snippets à trous (htsl-codemirror)

`htslCompletion(registry)` insère désormais le `snippet` de l'entrée via
`snippet()` de `@codemirror/autocomplete` (placeholders navigables au Tab,
premier trou sélectionné). Contrainte respectée : aucun défaut de placeholder ne
contient d'accolade (`snippet()` n'en gère pas l'imbrication).

## 3. Commande slash (htsl-codemirror)

Taper `/` en début de ligne ouvre la même base (objets + balises HTML +
composants). Le filtre porte sur le texte **après** le `/`, mais l'insertion
remplace depuis le `/` (qui disparaît). Le playground déclenche l'ouverture via
`startCompletion` quand `/` est seul sur la ligne.

## 4. Palette d'insertion (playground)

Drawer repliable (bouton **➕ Insérer**). C'est la **surface principale**
(l'éditeur brut est pour les power users) ; aussi la **description lisible mène**
et le chemin technique est secondaire.

Organisation (retour utilisateur) — **classification claire**, chaque type a sa
place : `Objets créés` (composants définis par l'utilisateur, lus à chaque
ouverture via `registry.components(parse(doc))` ; un libellé d'aide invite à en
définir s'il n'y en a pas) · `Textes` (structure) · `Formules` (formules +
équations) · `Scènes` (les conteneurs 2D/3D) · `Géométrie` (les acteurs qui vont
dans une scène).
- **Aperçus en texte brut** : `compile(example)` *sans* KaTeX → le texte du rendu
  (les maths restent en LaTeX source), plus léger et plus clair que des formules
  rendues ; les scènes affichent « 🧊 Graphique interactif ». Mis en cache.
- **Contenu tampon à l'insertion** : un conteneur s'insère **déjà rempli** et
  visible au rendu — un composant reçoit `Contenu du conteneur.` et ses
  paramètres sans défaut prennent leur nom comme valeur (jamais d'attribut vide
  malformé) ; une scène reçoit un acteur par défaut (cercle/point en 2D, sphère
  en 3D). Rien n'est jamais une coquille vide.

Recherche insensible aux accents (nom/chemin/description). Clic = insertion du
snippet au curseur + focus rendu à l'éditeur. Généré uniquement depuis
l'introspection (`registry.list()` + `registry.components()`).

## 5. Aide contextuelle (playground)

Panneau discret sous l'éditeur : pour l'objet sous le curseur (plus proche
`{@path` ouvert), affiche `describe()` — description + tableau d'attributs
(type, requis/défaut, description).

## Test cible (vérifié en navigateur)

Un utilisateur ne connaissant pas HTSL construit **titre + équation numérotée +
scène 3D** uniquement à la souris (clics palette) : le document obtenu rend un
`<h1>`, une équation KaTeX numérotée `(1)` et une scène Plotly.

## Garanties

Syntaxe du langage **inchangée** (les balises HTML restent de simples
`{tag:...}`, jamais des `@`-objets). Tests : core **179**, codemirror **25**.
