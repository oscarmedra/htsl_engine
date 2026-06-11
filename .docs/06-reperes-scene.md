# 06 — Repères de scène (décor / acteur)

## Objectif

Ajouter les objets de **repère** aux scènes géométriques. Un repère est un objet
structuré déclaratif qui décrit le cadre mathématique d'une scène ; sa
traduction Plotly (layout) n'est qu'un rendu parmi d'autres.

## Règle d'architecture : décor vs. acteur

Dans une scène :

- **Décor** : configure le cadre. `math.geometry.2d.frame` (2D) et
  `math.geometry.3d.space` (3D). **Au plus un par scène** — un second déclenche
  une `HTSLError` localisée (ligne/colonne). Pris en compte quelle que soit sa
  position parmi les enfants. Sans décor → défauts inchangés (aucune régression).
- **Acteurs** : dessinés (point, circle, plane, sphere, cpoint…).

Le mot **plane** reste réservé à l'acteur `mg3.plane` existant ; les repères ont
leurs propres noms (`frame`/`space`).

## Objets

| Objet | Alias | Rôle |
|-------|-------|------|
| `math.geometry.2d.frame` | `mg2.frame`, `repere` (fr) | repère cartésien 2D / plan complexe |
| `math.geometry.3d.space` | `mg3.space` | repère 3D |
| `math.geometry.2d.cpoint` | `mg2.cpoint` | point d'affixe complexe (acteur) |

### `frame` 2D

Attributs : `xrange`, `yrange`, `grid`, `ticks` (dtick), `equal` (défaut **true**
→ `scaleanchor:"y"`, orthonormé), `axes`, `labels` (`"x,y"`).
Variante : `type=complex`, `range`, `unitcircle=true` → axes `Re(z)`/`Im(z)` et
cercle unité en pointillés (trace de décor).

### `space` 3D

`xrange`/`yrange`/`zrange`, `grid`, `ticks`, `equal` (→ `aspectmode:"data"`),
`labels` (défaut `"x,y,z"`).

### `cpoint`

`z="3+2i"` (parsing `parseComplex` : `a+bi`, `a-bi`, `bi`, `a`, signes négatifs,
décimales), `name`/`label`, `color`.

## Implémentation (`src/objects/geometry.ts`)

- `sceneSpec(scene, source?)` repère le décor (au plus un, sinon erreur), génère
  les traces des acteurs + les traces de décor (cercle unité), puis appelle
  `build2dLayout`/`build3dLayout`.
- `build2dLayout` / `build3dLayout` traduisent le décor en layout Plotly ;
  sans décor, conservent le comportement précédent.
- `parseComplex` / `complexLatex` ; `isDecorPath`.
- `latexOfGeometry` : hors-scène, `frame` → `(O;\ \vec{\imath},\ \vec{\jmath})`,
  `space` → `(O;\ \vec{\imath},\ \vec{\jmath},\ \vec{k})`, `cpoint` → affixe.
- `math.ts` passe `source` à `renderScene` → `sceneSpec` (erreurs localisées).

## Tests (`tests/frame.test.ts`, 18)

`parseComplex` (toutes formes), layout `equal`/`grid`/`ticks`/labels, plan
complexe (Re/Im, cercle unité, affixes), space 3D, décor où qu'il soit, erreur
double-repère (2D et 3D), défauts sans frame inchangés, notation LaTeX
hors-scène. Total : **146 tests** verts.

## Démo

`demo-geometry.htsl` et `examples/geometry.html` : repère orthonormé gradué,
plan complexe (cercle unité + affixes A/B/i), scène 3D avec `space`. Rendu
confirmé en navigateur.
