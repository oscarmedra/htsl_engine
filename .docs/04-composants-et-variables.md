# 04 — Composants & variables

## Objectif

Ajouter un système de **composants** et de **variables**, fidèle à « tout est
objet structuré », résolu par **expansion d'AST avant le rendu** (le renderer ne
voit que des nœuds normaux).

## Syntaxe

- Définition : `{!define name[params]: body}` — params avec défauts optionnels
  (`color=indigo`). Corps utilisant `{$param}`, `{$children}` et `{$var}`.
- Usage : `{@name[arg="..."]: contenu}` (le contenu alimente `{$children}`).
- Variable : `{!set name: valeur}` puis `{$name}` (texte, valeurs d'attributs,
  corps de composants).

## Implémentation

### Lexer (`src/lexer.ts`)

- `{!define name` → `DEFINE_OPEN(name)` + frame header (directive).
- `{!set name` → `SET_OPEN(name)` + frame header (directive).
- `{$name}` → `VARREF(name)` (dans le contenu et dans le mode math).
- `{!--` reste un commentaire ; les frames `directive` n'enregistrent pas de tag.

### Parser (`src/parser.ts`)

- `parseDefine` (params via `parseParams`, corps = contenu), `parseSet`
  (valeur = contenu), `VARREF` → `VarRefNode`. Nouveaux nœuds AST : `DefineNode`,
  `SetNode`, `VarRefNode`, type `Param`.

### Expansion (`src/components/expand.ts`)

1. **Première passe** : collecte des `!define` sur tout l'arbre (usage avant
   définition valide). Clé = chemin résolu (registre `@`). Collision avec objet
   enregistré → erreur ; redéfinition de composant → erreur.
2. **Passe d'expansion** (pré-ordre, portée document mutable) :
   - `SetNode` → évalue la valeur (chaîne) et met à jour le scope ; sort rien.
   - `VarRefNode` → texte (variable) ou nœuds `{$children}` ; inconnue → erreur.
   - `ObjectNode` composant → `expandComponent` (params depuis les attributs de
     l'usage interpolés en scope externe, défauts, `{$children}` = enfants
     expansés ; corps expansé dans un scope dérivé). Récursion via pile +
     profondeur max 64.
   - `ElementNode`/`ObjectNode` normaux → interpolation des valeurs d'attributs
     (`{$name}`) + expansion des enfants.
   - `define`/`set`/`var` disparaissent de la sortie.

Intégration : `render` appelle `expand` en tête (avec `source` pour les
excerpts d'erreur), puis construit le contexte math et rend. `expand` est
exporté publiquement.

## Ombrage des noms (l'intention de l'auteur gagne)

La table des composants est désormais indexée par le **nom exact écrit** (et
l'usage est résolu par `rawPath`). Un `{!define}` peut donc porter le même nom
qu'un objet intégré (ou un de ses alias) : il **masque** alors ce nom précis,
sans erreur de collision. Ex. : `{!define carte[…]}` rend `{@carte}` égal au
composant, tandis que `{@flashcard}` (le nom canonique) atteint toujours l'objet
intégré. Aucun mot n'est « réservé » côté auteur ; seul un **doublon de define**
(même nom défini deux fois) reste une erreur.

## Erreurs localisées

Paramètre obligatoire manquant, variable inconnue, récursion infinie, profondeur
max (64), doublon de define (même nom), composant/variable jamais fermé.

## Tests (`tests/components.test.ts`, 22)

Expansion + injection params/children, défauts et override, paramètre manquant,
usage avant définition, self-closing, composant dans composant, récursion directe
et mutuelle, **ombrage d'un objet intégré par un define (et nom canonique encore
joignable)**, doublon, variables (texte, attributs, redéfinition, var→var,
inconnue, var document dans composant), composant + math.

## Démo

`demo-formulas.htsl` réécrit avec un composant `card[title, color=indigo]`
réutilisé pour chaque section (+ variable `accent`). `teste.html` (navigateur,
Tailwind) : 9 cartes générées depuis une seule définition `card`.

## Non-régression

Tous les tests précédents restent verts. Total : **112 tests**.
