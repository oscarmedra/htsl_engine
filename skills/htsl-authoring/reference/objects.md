# Catalogue des objets HTSL

> Généré depuis le registre d'introspection du moteur (`registry.list()/describe()`).
> Source unique de vérité. **125 entrées.** `*` = attribut requis ; `=…` = valeur par défaut.

## Sommaire

- [Structure & mise en page (éléments HTML + objets)](#structure) — 37
- [Mathématiques (formules & objets)](#formules) — 22
- [Géométrie, graphes & données](#géométrie) — 37
- [Documents pédagogiques & encadrés](#document) — 29

## Structure & mise en page (éléments HTML + objets)

### `a`

*élément HTML* — Lien hypertexte.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `href` | string |  |  | URL de destination. |

```htsl
{a[href="https://exemple.fr"]:un lien}
```

### `audio`

*élément HTML* — Audio (avec contrôles natifs).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `src` | string |  |  | URL du son (ou utiliser {source}/). |
| `controls` | boolean | `false` |  | Afficher les contrôles de lecture. |
| `autoplay` | boolean | `false` |  | Lecture automatique. |
| `loop` | boolean | `false` |  | Lecture en boucle. |
| `muted` | boolean | `false` |  | Démarrer sans le son. |

```htsl
{audio[src="son.mp3", controls]:}
```

### `blockquote`

*élément HTML* — Citation en bloc.

```htsl
{blockquote:Une citation.}
```

### `code`

*élément HTML* — Code en ligne.

```htsl
{p:appelez {code:f(x)}}
```

### `div`

*élément HTML* — Conteneur (avec classes CSS).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `class` | string |  |  | Classes CSS (ex. Tailwind). |

```htsl
{div[class="box"]:contenu}
```

### `em`

*élément HTML* — Texte en italique.

```htsl
{p:de l'{em:italique} ici}
```

### `figcaption`

*élément HTML* — Légende d'une figure.

```htsl
{figcaption:Figure 1.}
```

### `figure`

*élément HTML* — Figure (image + légende).

```htsl
{figure:{img[src="schema.png", alt="schéma"]/}{figcaption:Figure 1 — le schéma}}
```

### `h1`

*élément HTML* — Titre de niveau 1.

```htsl
{h1:Titre principal}
```

### `h2`

*élément HTML* — Titre de niveau 2.

```htsl
{h2:Sous-titre}
```

### `h3`

*élément HTML* — Titre de niveau 3.

```htsl
{h3:Titre}
```

### `hr`

*élément HTML* — Séparateur horizontal.

```htsl
{hr/}
```

### `iframe`

*élément HTML* — Cadre embarqué (YouTube, carte, etc.).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `src` | string |  | ✓ | URL à embarquer. |
| `width` | number |  |  | Largeur (px). |
| `height` | number |  |  | Hauteur (px). |
| `title` | string |  |  | Titre accessible du cadre. |
| `allowfullscreen` | boolean | `false` |  | Autoriser le plein écran. |

```htsl
{iframe[src="https://www.youtube.com/embed/ID", width="560", height="315"]/}
```

### `img`

*élément HTML* — Image.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `src` | string |  | ✓ | Chemin/URL de l'image. |
| `alt` | string |  |  | Texte alternatif. |
| `width` | number |  |  | Largeur (px). |
| `height` | number |  |  | Hauteur (px). |

```htsl
{img[src="image.png", alt="une image"]/}
```

### `li`

*élément HTML* — Élément de liste.

```htsl
{ul:{li:item}}
```

### `ol`

*élément HTML* — Liste ordonnée (attribut type : marqueurs num/alpha/Alpha/roman/Roman/paren).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `type` | enum | `num` |  | Style des marqueurs : num 1. 2. (défaut), alpha (a) (b), Alpha (A) (B), roman (i) (ii), Roman (I) (II), paren 1) 2). |

```htsl
{ol[type=alpha]:{li:un}{li:deux}}
```

### `p`

*élément HTML* — Paragraphe de texte.

```htsl
{p:Un paragraphe.}
```

### `strong`

*élément HTML* — Texte en gras.

```htsl
{p:du {strong:gras} ici}
```

### `table`

*élément HTML* — Tableau.

```htsl
{table:{tr:{th:A}{th:B}}{tr:{td:1}{td:2}}}
```

### `ul`

*élément HTML* — Liste à puces.

```htsl
{ul:{li:premier}{li:deuxième}}
```

### `video`

*élément HTML* — Vidéo (avec contrôles natifs).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `src` | string |  |  | URL de la vidéo (ou utiliser {source}/). |
| `poster` | string |  |  | Image d'aperçu. |
| `width` | number |  |  | Largeur (px). |
| `height` | number |  |  | Hauteur (px). |
| `controls` | boolean | `false` |  | Afficher les contrôles de lecture. |
| `autoplay` | boolean | `false` |  | Lecture automatique (souvent exige muted). |
| `loop` | boolean | `false` |  | Lecture en boucle. |
| `muted` | boolean | `false` |  | Démarrer sans le son. |
| `playsinline` | boolean | `false` |  | Lecture en ligne sur mobile (pas de plein écran forcé). |

```htsl
{video[src="film.mp4", controls, width="480"]:}
```

### `badge` · alias : `pill`, `tag`, `etiquette`

*objet @* — Petite étiquette inline colorée. Attribut color (mêmes couleurs que {@panel}).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `color` | enum | `slate` |  | Couleur (défaut : slate). |

```htsl
{p:{@badge[color=green]: Nouveau} une fonctionnalité.}
```

### `codeblock` · alias : `listing`, `source`

*objet @* — Bloc de code : contenu pris VERBATIM (les { } et \ n'ont pas besoin d'être échappés). Attribut lang → classe language-… (compatible highlight.js si chargé).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `lang` | string |  |  | Langage (python, js, c…) pour la coloration. |

```htsl
{@codeblock[lang=python]:
def carre(x):
    return x * x
}
```

### `codeblock` · alias : `listing`, `source`

*objet @* — Bloc de code : contenu pris VERBATIM (les { } et \ n'ont pas besoin d'être échappés). Attribut lang → classe language-… (compatible highlight.js si chargé).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `lang` | string |  |  | Langage (python, js, c…) pour la coloration. |

```htsl
{@codeblock[lang=python]:
def carre(x):
    return x * x
}
```

### `columns` · alias : `colonnes`

*objet @* — Colonnes côte à côte : contient des {@col:…} (empilées sur petit écran).

```htsl
{@columns:
  {@col: {h3:Énoncé} {p:…}}
  {@col: {h3:Solution} {p:…}}
}
```

### `columns.col` · alias : `col`, `colonne`

*objet @* — Une colonne d'un {@columns:…} (peut contenir n'importe quel HTSL).

```htsl
{@col: {p:Contenu de la colonne.}}
```

### `flashcard` · alias : `carte`

*objet @* — Carte à retourner : {front:…} (recto) et {back:…} (verso). Clic = retourne (CSS pur).

```htsl
{@flashcard:
  {front: $e^{i\pi}+1$}
  {back: $= 0$}
}
```

### `mark` · alias : `surligne`, `highlight`

*objet @* — Surligneur : met en évidence un bout de texte (inline).

```htsl
{p:Un point {@mark: important} du cours.}
```

### `panel` · alias : `overview`, `box`, `panneau`

*objet @* — Encadré neutre, sans étiquette ni numéro (contrairement à {@theorem}…). Attribut color pour l'accent, title optionnel.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `color` | enum | `slate` |  | Couleur d'accent (défaut : slate, neutre). |
| `title` | string |  |  | Titre optionnel (affiché seulement s'il est fourni). |

```htsl
{@panel[color=indigo, title="En bref"]: {p:Un contenu mis en valeur.}}
```

### `quiz` · alias : `qcm`

*objet @* — Question à choix : {q:…} (énoncé), {opt:…} (options, {opt[correct=true]:…} = bonne réponse), {explain:…} (optionnel). Feedback ✓/✗ au clic (runtime).

```htsl
{@quiz:
  {q: Quelle est l'hypoténuse ?}
  {opt[correct=true]: Le côté opposé à l'angle droit}
  {opt: Le plus petit côté}
}
```

### `reveal` · alias : `solution`, `spoiler`

*objet @* — Bloc dépliable (correction cachée). `title` = libellé, `open=true` pour l'ouvrir.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Libellé du bouton (défaut « Solution »). |
| `open` | boolean | `false` |  | Ouvert au chargement. |

```htsl
{@reveal[title="Solution"]: {p:On a $c=5$.}}
```

### `slider.deck` · alias : `slider`

*objet @* — Présentation : conteneur de slides {@slider.slide:…}, navigable par boutons/flèches (runtime). Transitions et défilement auto optionnels. Les enfants qui ne sont pas des slides sont ignorés.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `transition` | enum | `none` |  | Effet de changement de slide : none, fade (fondu), slide (glissement), zoom. |
| `autoplay` | string |  |  | Défilement automatique : durée par slide (ex. « 8s », « 2m », « 500ms »). Ajoute un bouton ▶/⏸. |
| `loop` | boolean | `false` |  | Avec autoplay : revenir au premier slide après le dernier (sinon s'arrête). |

```htsl
{@slider[transition=fade, autoplay="6s", loop=true]:
  {@slider.slide: {h1:Titre}}
  {@slider.slide: {h2:Suite} {@mtb: E=mc^2}}
}
```

### `slider.slide`

*objet @* — Un slide d'une présentation {@slider:…} (peut contenir n'importe quel HTSL).

```htsl
{@slider.slide: {h2:Mon slide} {p:…}}
```

### `stepper` · alias : `etapes`

*objet @* — Suite d'étapes numérotées automatiquement : contient des {@step:…} (boîte à étiquette « Étape N »). guided=true = étapes repliées à révéler une à une.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `guided` | boolean | `false` |  | Étapes repliées (révélation pas à pas, sans JS). |

```htsl
{@stepper:
  {@step[title="Poser le problème"]: {p:On écrit l'équation.}}
  {@step[title="Résoudre"]: {@mtb: \Delta = b^2 - 4ac}}
}
```

### `stepper.step` · alias : `step`, `etape`

*objet @* — Une étape d'un {@stepper:…} (numérotée automatiquement). Attribut title optionnel.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre de l'étape (affiché après le numéro). |

```htsl
{@step[title="Calculer"]: {@mtb: x = \frac{-b}{2a}}}
```

### `tabs`

*objet @* — Onglets : conteneur de {@tabs.tab[title=…]:…} (navigation gérée par le runtime).

```htsl
{@tabs:
  {@tabs.tab[title="Énoncé"]: {p:…}}
  {@tabs.tab[title="Solution"]: {p:…}}
}
```

### `tabs.tab`

*objet @* — Un onglet d'un {@tabs:…} (attribut title = libellé de l'onglet).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Libellé de l'onglet. |

```htsl
{@tabs.tab[title="Indice"]: {p:…}}
```

## Mathématiques (formules & objets)

### `math.constant.e` · alias : `mc.e`

*objet @* — Constante e (Euler).

```htsl
{@mc.e/}
```

### `math.constant.i` · alias : `mc.i`

*objet @* — Unité imaginaire i.

```htsl
{@mc.i/}
```

### `math.constant.inf` · alias : `mc.inf`

*objet @* — Infini ∞.

```htsl
{@mc.inf/}
```

### `math.constant.phi` · alias : `mc.phi`

*objet @* — Nombre d'or φ.

```htsl
{@mc.phi/}
```

### `math.constant.pi` · alias : `mc.pi`

*objet @* — Constante π.

```htsl
{@mc.pi/}
```

### `math.object.complex` · alias : `moc`, `mo.complex`

*objet @* — Nombre complexe a + bi (attributs re, im).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `re` | number | `0` |  | Partie réelle. |
| `im` | number | `0` |  | Partie imaginaire. |

```htsl
{@moc[re=3, im=2]/}
```

### `math.object.fraction` · alias : `mof`, `mo.fraction`

*objet @* — Fraction \frac{}{} (enfants {num:...} et {den:...}).

```htsl
{@mof:{num:1}{den:2}}
```

### `math.object.interval` · alias : `moi`, `mo.interval`

*objet @* — Intervalle (attributs from, to, open = none|left|right|both).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `from` | number |  |  | Borne inférieure. |
| `to` | number |  |  | Borne supérieure. |
| `open` | enum | `none` |  | Borne(s) ouverte(s). |

```htsl
{@moi[from=0, to=1, open="right"]/}
```

### `math.object.matrix` · alias : `mom`, `mo.matrix`

*objet @* — Matrice (un enfant {row:a,b,…} par ligne, colonnes séparées par des virgules).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `delim` | enum | `paren` |  | Délimiteurs : paren ( ), bracket [ ], brace { }, bar |·| (déterminant), norm ‖·‖, none (aucun). |

```htsl
{@mom:{row:1,2}{row:3,4}}
```

### `math.object.qty` · alias : `qty`, `grandeur`, `mo.qty`

*objet @* — Grandeur physique : valeur + unité (unité en romain). Ex. {@qty[value=9.81, unit="m\cdot s^{-2}"]/}.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `value` | string |  |  | Valeur (LaTeX possible, ex. 3 \times 10^8). |
| `unit` | string |  |  | Unité en notation LaTeX (ex. m\cdot s^{-2}). |

```htsl
{@qty[value=9.81, unit="m\cdot s^{-2}"]/}
```

### `math.object.set` · alias : `mos`, `mo.set`

*objet @* — Ensemble { … } (le corps en est le contenu).

```htsl
{@mos: 1, 2, 3}
```

### `math.object.tensor` · alias : `mot`, `mo.tensor`

*objet @* — Tableau unifié : vecteur ({c:…}), matrice ({row:a,b,…}) ou tenseur ({slice:…} de {row:…}). Délimiteur réglable.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `delim` | enum | `paren` |  | Délimiteurs : paren ( ), bracket [ ], brace { }, bar |·| (déterminant), norm ‖·‖, none (aucun). |
| `orient` | enum |  |  | Orientation d'un vecteur à une seule {row:} (col = transposé en colonne). |

```htsl
{@mot:{slice[label="k=1"]:{row:1,0}{row:0,1}}{slice[label="k=2"]:{row:0,1}{row:1,0}}}
```

### `math.object.vector` · alias : `mov`, `mo.vector`

*objet @* — Vecteur colonne (un enfant {c:...} par composante).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `delim` | enum | `paren` |  | Délimiteurs : paren ( ), bracket [ ], brace { }, bar |·| (déterminant), norm ‖·‖, none (aucun). |

```htsl
{@mov:{c:1}{c:2}{c:3}}
```

### `math.text.align` · alias : `mta`, `mt.align`

*objet @* — Équations alignées (enfants {line: ...}).

```htsl
{@mta:
  {line: f(x) &= x^2}
  {line: &= x \cdot x}
}
```

### `math.text.block` · alias : `mtb`, `mt.block`

*objet @* — Formule centrée sur sa propre ligne.

```htsl
{@mtb: \int_0^1 x^2 \, dx}
```

### `math.text.cases` · alias : `mtc`, `mt.cases`

*objet @* — Définition par cas (enfants {case: ...}).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `intro` | string |  |  | Membre de gauche (ex. |x|). |

```htsl
{@mtc[intro="|x|"]:
  {case: x & \text{si } x \geq 0}
  {case: -x & \text{si } x < 0}
}
```

### `math.text.chem` · alias : `ce`, `chem`, `chimie`, `mt.chem`

*objet @* — Chimie (mhchem) : {@ce: H2SO4 + H2O -> …} → \ce{…}. Nécessite l'extension mhchem de KaTeX.

```htsl
{@ce: 2 H2 + O2 -> 2 H2O}
```

### `math.text.inline` · alias : `mti`, `mt.inline`

*objet @* — Formule LaTeX dans le flux du texte.

```htsl
{@mti: x^2 + 1}
```

### `math.text.system` · alias : `mts`, `mt.system`

*objet @* — Système d'équations avec accolade (enfants {line: ...}).

```htsl
{@mts:
  {line: 2x + y = 5}
  {line: x - y = 1}
}
```

### `signs`

*objet @* — Tableau de signes : enfants {pt[x=…]/} (et {pt[x=…, zero=true]/} pour une racine) et {s: +|-} entre eux. Attributs var, fn.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `var` | string |  |  | Nom de la variable (déf. x). |
| `fn` | string |  |  | Expression (déf. f(x)). |

```htsl
{@signs[var="x", fn="x-2"]:
  {pt[x="-\\infty"]/} {s: -} {pt[x="2", zero=true]/} {s: +} {pt[x="+\\infty"]/}
}
```

### `truthtable` · alias : `verite`, `tabverite`

*objet @* — Table de vérité : un {head: a, b, …} (en-tête) et des {row: V, F, …} (colonnes séparées par des virgules). V/1/vrai et F/0/faux sont colorés.

```htsl
{@truthtable:
  {head: p, q, p ∧ q}
  {row: V, V, V}
  {row: V, F, F}
  {row: F, V, F}
  {row: F, F, F}
}
```

### `variations`

*objet @* — Tableau de variations : enfants {pt[x=…, y=…]/} (abscisses + valeurs) et {up/}/{down/} entre eux. Attributs var, fn.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `var` | string |  |  | Nom de la variable (déf. x). |
| `fn` | string |  |  | Nom de la fonction (déf. f(x)). |

```htsl
{@variations[var="x", fn="f(x)"]:
  {pt[x="-\\infty", y="+\\infty"]/} {down/}
  {pt[x="0", y="-3"]/} {up/}
  {pt[x="+\\infty", y="+\\infty"]/}
}
```

## Géométrie, graphes & données

### `chart` · alias : `graphique`

*objet @* — Graphique de données (Plotly) : type bar|pie|line|histogram. Points via {pt[x=…, y=…]/} ; histogramme via l'attribut values="a,b,c".

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `type` | enum | `bar` |  | Type de graphique. |
| `title` | string |  |  | Titre. |
| `xtitle` | string |  |  | Titre de l'axe X. |
| `ytitle` | string |  |  | Titre de l'axe Y. |
| `values` | string |  |  | Valeurs « a,b,c » (histogramme). |
| `bins` | number |  |  | Nombre de classes (histogramme). |

```htsl
{@chart[type="bar", title="Notes"]:
  {pt[x="Lun", y=12]/}
  {pt[x="Mar", y=19]/}
}
```

### `math.geometry.2d.circle` · alias : `mg2.circle`

*objet @* — Cercle 2D.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `center` | tuple |  |  | Centre, ex. (0,0). |
| `radius` | number | `1` |  | Rayon. |
| `color` | color |  |  | Couleur de l'objet. |
| `opacity` | number |  |  | Opacité (0–1). |

```htsl
{@mg2.circle[center="(0,0)", radius=2]/}
```

### `math.geometry.2d.cpoint` · alias : `mg2.cpoint`

*objet @* — Point d'affixe complexe (a+bi).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `z` | complex |  | ✓ | Affixe, ex. 3+2i, -1-2i, i. |
| `name` | string |  |  | Étiquette affichée. |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@mg2.cpoint[z="3+2i", name=A]/}
```

### `math.geometry.2d.droite` · alias : `mg2.droite`

*objet @* — Droite 2D (point + direction).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `point` | tuple |  |  | Point de passage. |
| `dir` | tuple |  |  | Vecteur directeur, ex. (1,1). |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@mg2.droite[point="(0,0)", dir="(1,1)"]/}
```

### `math.geometry.2d.frame` · alias : `repere`, `mg2.frame`

*objet @* — Décor : repère cartésien 2D (ou plan complexe avec type=complex).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `xrange` | tuple |  |  | Intervalle des abscisses, ex. (-4,4). |
| `yrange` | tuple |  |  | Intervalle des ordonnées. |
| `grid` | boolean | `true` |  | Affiche la grille. |
| `ticks` | number |  |  | Pas des graduations. |
| `equal` | boolean | `true` |  | Repère orthonormé (un cercle reste rond). |
| `axes` | boolean | `true` |  | Affiche les axes. |
| `labels` | string | `x,y` |  | Étiquettes des axes. |
| `type` | enum |  |  | Type de repère. |
| `range` | number |  |  | Demi-étendue (plan complexe). |
| `unitcircle` | boolean | `false` |  | Trace le cercle unité (plan complexe). |

```htsl
{@mg2.frame[xrange="(-4,4)", yrange="(-3,3)", grid=true, ticks=1]/}
```

### `math.geometry.2d.point` · alias : `mg2.point`

*objet @* — Point 2D.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `x` | number |  | ✓ | Abscisse. |
| `y` | number |  | ✓ | Ordonnée. |
| `name` | string |  |  | Étiquette affichée. |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@mg2.point[x=1, y=2, name=A]/}
```

### `math.geometry.2d.polygon` · alias : `mg2.polygon`

*objet @* — Polygone 2D rempli.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `points` | points |  | ✓ | Sommets séparés par ;, ex. (0,0);(2,0);(1,2). |
| `color` | color |  |  | Couleur de l'objet. |
| `opacity` | number |  |  | Opacité (0–1). |

```htsl
{@mg2.polygon[points="(-2,-2);(2,-2);(0,3)"]/}
```

### `math.geometry.2d.scene` · alias : `mg2.scene`

*objet @* — Scène géométrique 2D (conteneur rendu via Plotly).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `width` | number | `600` |  | Largeur en pixels. |
| `height` | number | `400` |  | Hauteur en pixels. |

```htsl
{@mg2.scene:
  {@mg2.frame[grid=true]/}
  {@mg2.circle[center="(0,0)", radius=2]/}
}
```

### `math.geometry.2d.segment` · alias : `mg2.segment`

*objet @* — Segment 2D entre deux points.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `from` | tuple |  | ✓ | Première extrémité, ex. (0,0). |
| `to` | tuple |  | ✓ | Seconde extrémité. |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@mg2.segment[from="(0,0)", to="(3,4)"]/}
```

### `math.geometry.3d.line` · alias : `mg3.line`

*objet @* — Droite 3D (point + direction).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `point` | tuple |  |  | Point de passage. |
| `dir` | tuple |  |  | Vecteur directeur. |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@mg3.line[point="(0,0,0)", dir="(1,0,0)"]/}
```

### `math.geometry.3d.plane` · alias : `mg3.plane`

*objet @* — Plan 3D (équation normale·X = d), rendu en surface.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `normal` | tuple |  | ✓ | Vecteur normal, ex. (2,-1,3). |
| `d` | number | `0` |  | Terme constant. |
| `color` | color |  |  | Couleur de l'objet. |
| `opacity` | number |  |  | Opacité (0–1). |

```htsl
{@mg3.plane[normal="(2,-1,3)", d=5, opacity=0.5]/}
```

### `math.geometry.3d.point` · alias : `mg3.point`

*objet @* — Point 3D.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `x` | number |  | ✓ | Abscisse. |
| `y` | number |  | ✓ | Ordonnée. |
| `z` | number |  | ✓ | Cote. |
| `name` | string |  |  | Étiquette affichée. |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@mg3.point[x=1, y=2, z=3, name=A]/}
```

### `math.geometry.3d.scene` · alias : `mg3.scene`

*objet @* — Scène géométrique 3D (conteneur rendu via Plotly).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `width` | number | `600` |  | Largeur en pixels. |
| `height` | number | `400` |  | Hauteur en pixels. |

```htsl
{@mg3.scene:
  {@mg3.space[grid=true]/}
  {@mg3.sphere[center="(0,0,0)", radius=2]/}
}
```

### `math.geometry.3d.segment` · alias : `mg3.segment`

*objet @* — Segment 3D entre deux points.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `from` | tuple |  | ✓ | Première extrémité. |
| `to` | tuple |  | ✓ | Seconde extrémité. |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@mg3.segment[from="(-2,-2,-2)", to="(2,2,2)"]/}
```

### `math.geometry.3d.space` · alias : `mg3.space`

*objet @* — Décor : repère 3D.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `xrange` | tuple |  |  | Intervalle x. |
| `yrange` | tuple |  |  | Intervalle y. |
| `zrange` | tuple |  |  | Intervalle z. |
| `grid` | boolean | `true` |  | Affiche la grille. |
| `ticks` | number |  |  | Pas des graduations. |
| `equal` | boolean | `true` |  | Aspect orthonormé. |
| `labels` | string | `x,y,z` |  | Étiquettes des axes. |

```htsl
{@mg3.space[xrange="(-5,5)", grid=true, ticks=2]/}
```

### `math.geometry.3d.sphere` · alias : `mg3.sphere`

*objet @* — Sphère 3D (surface paramétrique).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `center` | tuple |  |  | Centre, ex. (0,0,0). |
| `radius` | number | `1` |  | Rayon. |
| `color` | color |  |  | Couleur de l'objet. |
| `opacity` | number |  |  | Opacité (0–1). |

```htsl
{@mg3.sphere[center="(0,0,0)", radius=2]/}
```

### `math.geometry.3d.vector` · alias : `mg3.vector`

*objet @* — Vecteur 3D (flèche avec cône).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `from` | tuple |  | ✓ | Origine, ex. (1,2,3). |
| `to` | tuple |  | ✓ | Extrémité. |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@mg3.vector[from="(1,2,3)", to="(1,3,4)"]/}
```

### `math.plot.curve` · alias : `plot.curve`

*objet @* — Une courbe y = f(x) dans un {@plot} (pour superposer plusieurs fonctions).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `fn` | string | `x` |  | Expression y=f(x). |
| `label` | string |  |  | Nom dans la légende. |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@plot.curve[fn="sin(x)", label="sin"]/}
```

### `math.plot.fn` · alias : `plot`, `plot.fn`

*objet @* — Graphe de fonction(s) y = f(x). Une seule (attr fn) ou plusieurs ({@plot.curve}).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `fn` | string |  |  | Expression y=f(x) (forme à une courbe). |
| `xrange` | tuple |  |  | Intervalle x, ex. (-10,10). |
| `samples` | number | `400` |  | Nombre de points. |
| `title` | string |  |  | Titre du graphe. |
| `color` | color |  |  | Couleur de l'objet. |
| `width` | number | `640` |  | Largeur en pixels. |
| `height` | number | `360` |  | Hauteur en pixels. |

```htsl
{@plot[fn="sin(x)/x", xrange="(-15,15)", title="y = sin(x)/x"]/}
```

### `numberline` · alias : `droite`, `droitegraduee`

*objet @* — Droite graduée (SVG) : attributs from, to, ticks. Enfants {point[x, name, color]/}, {segment[from, to, open, color]/} (open : none|left|right|both).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `from` | number | `-5` |  | Borne gauche. |
| `to` | number | `5` |  | Borne droite. |
| `ticks` | number | `1` |  | Pas des graduations. |

```htsl
{@numberline[from=-3, to=3]:
  {segment[from=0, to=2, open=right, color=crimson]/}
  {point[x=-1, name=A]/}
}
```

### `param` · alias : `curseur`

*objet @* — Paramètre interactif (curseur). Un {@plot} dont la fn utilise ce nom se met à jour en direct quand on bouge le curseur.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `name` | string |  | ✓ | Nom du paramètre (utilisé dans une fn de {@plot}). |
| `min` | number | `0` |  | Valeur minimale. |
| `max` | number | `10` |  | Valeur maximale. |
| `step` | number | `0.1` |  | Pas. |
| `value` | number |  |  | Valeur initiale (déf. min). |
| `label` | string |  |  | Libellé affiché (déf. le nom). |

```htsl
{@param[name="a", min=-3, max=3, step=0.1, value=1]/}
```

### `scene.3d.animate` · alias : `s3.animate`

*objet @* — Animation d'un objet (par id) : move / rotate / scale / color / fade / transform.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `target` | string |  | ✓ | id de l'objet à animer. |
| `action` | string | `move` |  | move | rotate | scale | color | fade | transform. |
| `to` | tuple |  |  | Destination : (x,y,z) pour move, ou un id pour transform. |
| `axis` | string | `y` |  | Axe de rotation (x/y/z). |
| `angle` | number | `90` |  | Angle de rotation (degrés). |
| `value` | number |  |  | Échelle (scale) ou opacité (fade). |
| `color` | color |  |  | Couleur de l'objet. |
| `duration` | number | `1` |  | Durée (secondes). |
| `delay` | number | `0` |  | Délai avant départ. |
| `at` | number |  |  | Départ absolu (sinon enchaîné après la précédente). |
| `easing` | string | `easeInOut` |  | linear | easeIn | easeOut | easeInOut. |

```htsl
{@s3.animate[target="A", action="move", to="(2,2,0)", duration=2]/}
```

### `scene.3d.axes` · alias : `s3.axes`

*objet @* — Repère 3D (axes X/Y/Z) pour la référence.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `size` | number | `3` |  | Longueur des axes. |

```htsl
{@s3.axes[size=3]/}
```

### `scene.3d.box` · alias : `s3.box`

*objet @* — Cube/boîte 3D (WebGL) : position, couleur, rotation, orbite.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `id` | string |  |  | Identifiant (cible des animations {@s3.animate}). |
| `size` | number | `1` |  | Côté. |
| `x` | number | `0` |  | Position x. |
| `y` | number | `0` |  | Position y. |
| `z` | number | `0` |  | Position z. |
| `color` | color |  |  | Couleur de l'objet. |
| `spin` | number | `0` |  | Rotation propre par image. |
| `orbit` | number | `0` |  | Rayon d'orbite autour de l'origine. |
| `speed` | number | `0` |  | Vitesse angulaire de l'orbite. |
| `glow` | boolean | `false` |  | Matériau auto-lumineux (ex. soleil). |
| `label` | string |  |  | Étiquette affichée près de l'objet. |

```htsl
{@s3.box[size=1, color="#f472b6", spin=0.01]/}
```

### `scene.3d.cone` · alias : `s3.cone`

*objet @* — Cône 3D : rayon de base + hauteur.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `radius` | number | `0.5` |  | Rayon de base. |
| `height` | number | `1` |  | Hauteur. |
| `id` | string |  |  | Identifiant (cible des animations {@s3.animate}). |
| `x` | number | `0` |  | Position x. |
| `y` | number | `0` |  | Position y. |
| `z` | number | `0` |  | Position z. |
| `color` | color |  |  | Couleur de l'objet. |
| `opacity` | number |  |  | Opacité (0–1). |
| `spin` | number | `0` |  | Rotation propre par image. |
| `orbit` | number | `0` |  | Rayon d'orbite autour de l'origine. |
| `speed` | number | `0` |  | Vitesse angulaire de l'orbite. |
| `glow` | boolean | `false` |  | Matériau auto-lumineux (ex. soleil). |
| `label` | string |  |  | Étiquette affichée près de l'objet. |

```htsl
{@s3.cone[radius=0.6, height=1.5, color="#fb923c"]/}
```

### `scene.3d.curve` · alias : `s3.curve`

*objet @* — Courbe paramétrique 3D (x(t), y(t), z(t)).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `x` | string | `cos(t)` |  | x(t). |
| `y` | string | `sin(t)` |  | y(t). |
| `z` | string | `t/3` |  | z(t). |
| `trange` | tuple |  |  | Intervalle de t, ex. (0, 6.28). |
| `samples` | number | `200` |  | Nombre de points. |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@s3.curve[x="cos(t)", y="sin(t)", z="t/3", trange="(0, 18)", color="#22d3ee"]/}
```

### `scene.3d.cylinder` · alias : `s3.cylinder`

*objet @* — Cylindre 3D : rayon + hauteur.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `radius` | number | `0.5` |  | Rayon. |
| `height` | number | `1` |  | Hauteur. |
| `id` | string |  |  | Identifiant (cible des animations {@s3.animate}). |
| `x` | number | `0` |  | Position x. |
| `y` | number | `0` |  | Position y. |
| `z` | number | `0` |  | Position z. |
| `color` | color |  |  | Couleur de l'objet. |
| `opacity` | number |  |  | Opacité (0–1). |
| `spin` | number | `0` |  | Rotation propre par image. |
| `orbit` | number | `0` |  | Rayon d'orbite autour de l'origine. |
| `speed` | number | `0` |  | Vitesse angulaire de l'orbite. |
| `glow` | boolean | `false` |  | Matériau auto-lumineux (ex. soleil). |
| `label` | string |  |  | Étiquette affichée près de l'objet. |

```htsl
{@s3.cylinder[radius=0.5, height=1.5, color="#a78bfa"]/}
```

### `scene.3d.grid` · alias : `s3.grid`

*objet @* — Grille au sol 3D (plan de référence).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `size` | number | `10` |  | Étendue de la grille. |
| `divisions` | number | `10` |  | Nombre de divisions. |

```htsl
{@s3.grid[size=10, divisions=10]/}
```

### `scene.3d.label` · alias : `s3.label`

*objet @* — Étiquette texte 3D (billboard, toujours face caméra).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `text` | string |  |  | Texte affiché. |
| `x` | number | `0` |  | Position x. |
| `y` | number | `0` |  | Position y. |
| `z` | number | `0` |  | Position z. |
| `color` | color |  |  | Couleur de l'objet. |
| `size` | number | `0.4` |  | Taille. |

```htsl
{@s3.label[text="O", x=0, y=0, z=0]/}
```

### `scene.3d.line` · alias : `s3.line`

*objet @* — Ligne / trajectoire 3D : liste de points séparés par ';'.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `points` | tuple |  |  | Points, ex. (0,0,0);(1,1,0);(2,0,1). |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@s3.line[points="(0,0,0);(1,1,0);(2,0,1);(3,1,0)", color="#22d3ee"]/}
```

### `scene.3d.plane` · alias : `s3.plane`

*objet @* — Plan 3D (carré, horizontal par défaut).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `size` | number | `6` |  | Côté du plan. |
| `id` | string |  |  | Identifiant (cible des animations {@s3.animate}). |
| `x` | number | `0` |  | Position x. |
| `y` | number | `0` |  | Position y. |
| `z` | number | `0` |  | Position z. |
| `color` | color |  |  | Couleur de l'objet. |
| `opacity` | number |  |  | Opacité (0–1). |
| `spin` | number | `0` |  | Rotation propre par image. |
| `orbit` | number | `0` |  | Rayon d'orbite autour de l'origine. |
| `speed` | number | `0` |  | Vitesse angulaire de l'orbite. |
| `glow` | boolean | `false` |  | Matériau auto-lumineux (ex. soleil). |
| `label` | string |  |  | Étiquette affichée près de l'objet. |

```htsl
{@s3.plane[size=6, color="#1e293b", opacity=0.6]/}
```

### `scene.3d.point` · alias : `s3.point`

*objet @* — Point 3D (petit marqueur) ; orbit = trajectoire animée.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `radius` | number | `0.12` |  | Taille du marqueur. |
| `id` | string |  |  | Identifiant (cible des animations {@s3.animate}). |
| `x` | number | `0` |  | Position x. |
| `y` | number | `0` |  | Position y. |
| `z` | number | `0` |  | Position z. |
| `color` | color |  |  | Couleur de l'objet. |
| `opacity` | number |  |  | Opacité (0–1). |
| `spin` | number | `0` |  | Rotation propre par image. |
| `orbit` | number | `0` |  | Rayon d'orbite autour de l'origine. |
| `speed` | number | `0` |  | Vitesse angulaire de l'orbite. |
| `glow` | boolean | `false` |  | Matériau auto-lumineux (ex. soleil). |
| `label` | string |  |  | Étiquette affichée près de l'objet. |

```htsl
{@s3.point[x=1, y=1, z=1, color="#f87171", label="A"]/}
```

### `scene.3d.scene` · alias : `s3.scene`

*objet @* — Scène 3D animée (WebGL, rendue via Three.js).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `width` | number | `600` |  | Largeur en pixels. |
| `height` | number | `400` |  | Hauteur en pixels. |
| `background` | string | `#020617` |  | Couleur de fond. |
| `distance` | number | `6` |  | Distance de la caméra. |
| `controls` | boolean | `false` |  | Rotation à la souris (OrbitControls). |
| `autorotate` | boolean | `false` |  | Rotation automatique lente. |

```htsl
{@s3.scene[height=480]:
  {@s3.sphere[radius=0.8, color="#facc15", glow=true, spin=0.003]/}
  {@s3.sphere[radius=0.3, color="#60a5fa", orbit=3, speed=0.02]/}
}
```

### `scene.3d.sphere` · alias : `s3.sphere`

*objet @* — Sphère 3D (WebGL) : position, couleur, rotation, orbite.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `id` | string |  |  | Identifiant (cible des animations {@s3.animate}). |
| `radius` | number | `0.5` |  | Rayon. |
| `x` | number | `0` |  | Position x. |
| `y` | number | `0` |  | Position y. |
| `z` | number | `0` |  | Position z. |
| `color` | color |  |  | Couleur de l'objet. |
| `spin` | number | `0` |  | Rotation propre par image. |
| `orbit` | number | `0` |  | Rayon d'orbite autour de l'origine. |
| `speed` | number | `0` |  | Vitesse angulaire de l'orbite. |
| `glow` | boolean | `false` |  | Matériau auto-lumineux (ex. soleil). |
| `label` | string |  |  | Étiquette affichée près de l'objet. |

```htsl
{@s3.sphere[radius=0.4, color="#60a5fa", orbit=3, speed=0.02]/}
```

### `scene.3d.surface` · alias : `s3.surface`

*objet @* — Surface z = f(x, y) (expression mathématique évaluée).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `z` | string | `0` |  | Expression z=f(x,y), ex. sin(x)*cos(y). |
| `xrange` | tuple |  |  | Intervalle x, ex. (-3,3). |
| `yrange` | tuple |  |  | Intervalle y, ex. (-3,3). |
| `res` | number | `36` |  | Résolution de la grille. |
| `color` | color |  |  | Couleur de l'objet. |
| `opacity` | number |  |  | Opacité (0–1). |

```htsl
{@s3.surface[z="sin(x)*cos(y)", xrange="(-3,3)", yrange="(-3,3)", color="#60a5fa"]/}
```

### `scene.3d.torus` · alias : `s3.torus`

*objet @* — Tore (donut) 3D : rayon + rayon du tube.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `radius` | number | `1` |  | Rayon principal. |
| `tube` | number | `0.3` |  | Rayon du tube. |
| `id` | string |  |  | Identifiant (cible des animations {@s3.animate}). |
| `x` | number | `0` |  | Position x. |
| `y` | number | `0` |  | Position y. |
| `z` | number | `0` |  | Position z. |
| `color` | color |  |  | Couleur de l'objet. |
| `opacity` | number |  |  | Opacité (0–1). |
| `spin` | number | `0` |  | Rotation propre par image. |
| `orbit` | number | `0` |  | Rayon d'orbite autour de l'origine. |
| `speed` | number | `0` |  | Vitesse angulaire de l'orbite. |
| `glow` | boolean | `false` |  | Matériau auto-lumineux (ex. soleil). |
| `label` | string |  |  | Étiquette affichée près de l'objet. |

```htsl
{@s3.torus[radius=1, tube=0.3, color="#34d399", spin=0.01]/}
```

### `scene.3d.vector` · alias : `s3.vector`

*objet @* — Vecteur 3D (flèche) — forces, champs, déplacements.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `from` | tuple |  |  | Origine, ex. (0,0,0). |
| `to` | tuple |  |  | Extrémité, ex. (1,2,1). |
| `color` | color |  |  | Couleur de l'objet. |

```htsl
{@s3.vector[from="(0,0,0)", to="(2,1,1)", color="#f59e0b"]/}
```

## Documents pédagogiques & encadrés

### `callout.algorithm` · alias : `algorithm`, `algorithme`, `algo`

*objet @* — Encadré « Algorithme » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@algorithm: {p:énoncé}}
```

### `callout.axiom` · alias : `axiom`, `axiome`

*objet @* — Encadré « Axiome » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@axiom: {p:énoncé}}
```

### `callout.claim` · alias : `claim`, `assertion`

*objet @* — Encadré « Assertion » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@claim: {p:énoncé}}
```

### `callout.conjecture` · alias : `conjecture`

*objet @* — Encadré « Conjecture » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@conjecture: {p:énoncé}}
```

### `callout.construction` · alias : `construction`, `constr`

*objet @* — Encadré « Construction » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@construction: {p:énoncé}}
```

### `callout.corollary` · alias : `corollary`, `corollaire`, `cor`

*objet @* — Encadré « Corollaire » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@corollary: {p:énoncé}}
```

### `callout.definition` · alias : `definition`, `def`

*objet @* — Encadré « Définition » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@definition: {p:énoncé}}
```

### `callout.example` · alias : `example`, `exemple`, `ex`

*objet @* — Encadré « Exemple » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@example: {p:énoncé}}
```

### `callout.hypothesis` · alias : `hypothesis`, `assumption`, `hypothese`, `hyp`

*objet @* — Encadré « Hypothèse » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@hypothesis: {p:énoncé}}
```

### `callout.lemma` · alias : `lemma`, `lemme`, `lem`

*objet @* — Encadré « Lemme » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@lemma: {p:énoncé}}
```

### `callout.notation` · alias : `notation`

*objet @* — Encadré « Notation » — attributs optionnels title.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |

```htsl
{@notation: …}
```

### `callout.observation` · alias : `observation`, `obs`

*objet @* — Encadré « Observation » — attributs optionnels title.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |

```htsl
{@observation: …}
```

### `callout.proof` · alias : `proof`, `preuve`, `demo`

*objet @* — Encadré « Démonstration » — attributs optionnels title.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |

```htsl
{@proof: …}
```

### `callout.property` · alias : `property`, `propriete`, `prop`

*objet @* — Encadré « Propriété » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@property: {p:énoncé}}
```

### `callout.proposition` · alias : `proposition`

*objet @* — Encadré « Proposition » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@proposition: {p:énoncé}}
```

### `callout.ref` · alias : `ref`

*objet @* — Renvoi cliquable vers un encadré numéroté (attribut to = son label).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `to` | string |  | ✓ | Label de l'encadré cible. |

```htsl
{@ref[to=pyth]/}
```

### `callout.remark` · alias : `remark`, `remarque`, `rem`

*objet @* — Encadré « Remarque » — attributs optionnels title.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |

```htsl
{@remark: …}
```

### `callout.theorem` · alias : `theorem`, `theoreme`, `thm`

*objet @* — Encadré « Théorème » (numéroté) — attributs optionnels title, label.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |
| `label` | string |  |  | Étiquette pour un renvoi {@ref}. |

```htsl
{@theorem: {p:énoncé}}
```

### `callout.warning` · alias : `warning`, `attention`

*objet @* — Encadré « Attention » — attributs optionnels title.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Titre court affiché après le numéro. |

```htsl
{@warning: …}
```

### `checklist` · alias : `todo`, `cases`

*objet @* — Liste à cases à cocher (natives, cochables) : enfants {item:…} ({item[checked=true]:…} = déjà coché).

```htsl
{@checklist:
  {item[checked=true]: Poser l'équation}
  {item: Calculer le discriminant}
}
```

### `deflist` · alias : `glossaire`, `definitions`

*objet @* — Liste de définitions / glossaire : paires {term:…} / {def:…} → <dl>.

```htsl
{@deflist:
  {term: Vitesse} {def: distance parcourue par unité de temps}
  {term: Accélération} {def: variation de la vitesse}
}
```

### `document` · alias : `livre`, `pages`

*objet @* — Document paginé pour l'impression / PDF : contient des {@document.page:…}. Chaque page démarre sur une nouvelle feuille à l'impression ; si son contenu déborde, il se poursuit tout seul sur la feuille suivante (rien n'est coupé). Idéal pour rédiger un livre.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `format` | string | `a4` |  | Format de la feuille (défaut a4). Noms : a0–a10, b0–b10, c0–c10, letter, legal, tabloid, ledger, executive, statement, dl, card, slide (16:9), slide43 (4:3). Ou taille libre entre guillemets : format="300x400" (mm), format="30x40cm", format="8.5x11in". |
| `numbers` | boolean | `false` |  | Numéroter les pages (bas de page). |
| `mode` | enum | `flow` |  | flow : feuilles empilées (défaut). book : lecture comme un vrai livre, on feuillette page par page (flèches / clic). |
| `grid` | enum | `none` |  | Cadrillage de fond appliqué à toutes les pages (aide à l'écriture). lines : lignes. squares : quadrillage. dots : points. (Coche « Graphiques d'arrière-plan » pour l'imprimer.) |
| `header` | string |  |  | En-tête courant répété en haut de chaque page. |
| `footer` | string |  |  | Pied de page courant répété en bas de chaque page. |

```htsl
{@document[numbers=true]:
  {@document.page: {h1:Chapitre 1} {p:Le début de l'histoire…}}
  {@document.page: {h1:Chapitre 2} {p:La suite…}}
}
```

### `document.page`

*objet @* — Une page d'un {@document:…} (chemin complet, comme {@slider.slide}, pour ne pas occuper le nom court « page »). On y écrit librement ; à l'impression elle occupe une feuille, et son trop-plein continue automatiquement sur la feuille suivante. grid/header/footer surchargent, pour cette page, les valeurs du document.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `grid` | enum |  |  | Cadrillage de cette page seule (surcharge le document). |
| `header` | string |  |  | En-tête de cette page seule (surcharge le document). |
| `footer` | string |  |  | Pied de cette page seule (surcharge le document). |

```htsl
{@document.page: {h2:Titre} {p:Un paragraphe.}}
```

### `exercise` · alias : `exercice`

*objet @* — Exercice numéroté automatiquement (« Exercice N »). Un enfant {solution:…} devient une correction repliable. Attribut title optionnel.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `title` | string |  |  | Intitulé affiché après le numéro. |

```htsl
{@exercise[title="Second degré"]:
  {p:Résoudre $x^2 - 2x - 3 = 0$.}
  {solution: {p:$x_1 = 3$, $x_2 = -1$.}}
}
```

### `math.text.equation` · alias : `mte`, `mt.equation`

*objet @* — Équation numérotée automatiquement.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `label` | string |  |  | Étiquette pour les références croisées. |

```htsl
{@mte[label=eq1]: E = mc^2}
```

### `math.text.ref` · alias : `mtr`, `mt.ref`

*objet @* — Référence croisée vers une équation numérotée.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `to` | string |  | ✓ | Label de l'équation cible. |

```htsl
{@mte[label=eq1]: E = mc^2}{p:voir l'équation {@mtr[to=eq1]/}}
```

### `pdf` · alias : `visionneuse`

*objet @* — Visionneuse d'un PDF depuis un lien (affichage écran, lecteur natif du navigateur). src = lien http/https ; page = ouvrir directement à ce numéro ; height = hauteur d'affichage. Un bouton « Ouvrir le PDF » sert de repli si le serveur interdit l'affichage. Note : visionneuse écran — le PDF embarqué ne s'imprime pas dans ton propre export.

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `src` | string |  | ✓ | Lien du PDF (http / https). |
| `page` | number |  |  | Ouvrir directement à cette page. |
| `height` | string | `600px` |  | Hauteur d'affichage (ex. 600px, 80vh). |
| `toolbar` | boolean | `false` |  | Afficher la barre d'outils du lecteur (zoom, pages…). Masquée par défaut : affichage minimal (Chrome/Brave/Edge). |

```htsl
{@pdf[src="https://…/cours.pdf", page=12]/}
```

### `timeline` · alias : `chronologie`

*objet @* — Frise chronologique : contient des {@event[date=…]:…} (point + date + contenu).

```htsl
{@timeline:
  {@event[date="1687"]: {p:Newton — Principia}}
  {@event[date="1905"]: {p:Einstein — relativité restreinte}}
}
```

### `timeline.event` · alias : `event`, `evenement`

*objet @* — Un évènement d'une {@timeline:…} (attribut date).

| attribut | type | déf. | requis | rôle |
|---|---|---|---|---|
| `date` | string |  |  | Date/étiquette affichée. |

```htsl
{@event[date="1905"]: {p:Un évènement.}}
```

