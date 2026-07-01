# 23 — Délimiteurs de matrices & objet tenseur `@mot`

## Objectif

Deux ajouts à la couche math :

1. **Délimiteurs réglables** sur les vecteurs/matrices (crochets, barres de
   déterminant, doubles barres de norme…), au lieu des seules parenthèses.
2. Un objet **unifié `@mot`** (`math.object.tensor`) qui rend un **vecteur**, une
   **matrice** ou un **tenseur** (rang 3) avec une seule syntaxe.

## Délimiteurs (attribut `delim`)

Disponible sur `@mov`, `@mom` et `@mot`. Il choisit l'environnement KaTeX :

| `delim` | Rendu | Environnement |
|---|---|---|
| `paren` (défaut) | `( )` | `pmatrix` |
| `bracket` (ou `crochet`) | `[ ]` | `bmatrix` |
| `brace` (ou `accolade`) | `{ }` | `Bmatrix` |
| `bar` (ou `det`) | `\|·\|` déterminant | `vmatrix` |
| `norm` (ou `norme`) | `‖·‖` norme | `Vmatrix` |
| `none` (ou `aucun`) | aucun | `matrix` |

`matrixEnv(delim)` (`objects/math.ts`) fait la correspondance et tolère les
synonymes français.

```
{@mom[delim=bracket]: {row:1,2}{row:3,4}}   → [ 1 2 ; 3 4 ]
{@mom[delim=bar]: {row:1,2}{row:3,4}}        → déterminant | 1 2 ; 3 4 |
```

## Objet unifié `@mot` (`math.object.tensor`, alias `mot`)

Une seule syntaxe pour les trois rangs :

| Forme | Contenu | Rendu |
|---|---|---|
| Vecteur colonne | `{c: …}` par composante | `[ a ; b ; c ]` |
| Vecteur ligne | une seule `{row: a,b,c}` | `[ a b c ]` |
| Vecteur colonne (transposé) | `{row: a,b,c}` + `[orient=col]` | `[ a ; b ; c ]` |
| Matrice | plusieurs `{row: …}` | grille 2D |
| **Tenseur (rang 3)** | des `{slice: {row…}…}` | tranches 2D **côte à côte**, étiquetées |

Le tenseur est rendu comme une suite de matrices 2D (« tranches frontales »)
séparées par `\quad`, chacune sous une étiquette via `\underset{label}{…}` —
`{slice[label="k=1"]:…}`, sinon numérotées `1, 2, …`. C'est la représentation
pédagogique standard d'un tenseur d'ordre 3.

```
{@mot[delim=bracket]:
  {slice[label="k=1"]: {row:1,0}{row:0,1}}
  {slice[label="k=2"]: {row:0,1}{row:1,0}}
}
```

## Portée : afficher, pas calculer

HTSL **rend** le tableau écrit ; il ne calcule pas (produit tensoriel, det, etc.).
Pour un produit tensoriel $\mathbf{v}\otimes\mathbf{w}$, on écrit la matrice des
$v_i w_j$ (les cellules acceptent du LaTeX). Cohérent avec la philosophie du moteur.

## Tests (`tests/tensor.test.ts`, 13)

Chaque `delim` → bon environnement (+ synonyme `crochet`) ; `@mot` en vecteur
colonne/ligne, transposé `orient=col`, matrice, et tenseur (tranches étiquetées
+ auto-numérotées). Suite core : 287.

## Vérifié en navigateur

Crochets, déterminant `|·|`, norme `‖·‖` et le tenseur (deux tranches `[ ]`
côte à côte, k=1 / k=2) rendus par KaTeX sans erreur ; autocomplétion de
`{@mot}` avec ses attributs `delim`/`orient` ; 0 erreur console.
