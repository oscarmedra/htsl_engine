# HTSL — syntaxe approfondie

Référence des sujets qui demandent plus que le résumé du `SKILL.md`. Pour la
liste des objets/attributs, voir `objects.md`.

## Mathématiques

### Inline, bloc, numérotation

- `{@mti: a^2+b^2=c^2}` ≡ `$a^2+b^2=c^2$` — formule dans le flux.
- `{@mtb: \sum_{n=1}^{\infty}\frac1{n^2}=\frac{\pi^2}6}` ≡ `$$…$$` — centrée.
- `{@mte[label=pyth]: a^2+b^2=c^2}` — **équation numérotée** `(n)`.
- `{@mtr[to=pyth]/}` — **renvoi** `(n)` cliquable vers cette équation.
- `\$` échappe un dollar littéral. `$…$` et `{@mti}` produisent exactement le
  même AST (un seul chemin de rendu) ; de même `$$…$$` ≡ `{@mtb}`.

### Multi-lignes

```htsl
{@mta:                      {!-- équations alignées, & = point d'alignement --}
  {line: f(x) &= (x+1)^2}
  {line: &= x^2 + 2x + 1}
}
{@mts:                      {!-- système avec accolade --}
  {line: 2x + y = 5}
  {line: x - y = 1}
}
{@mtc[intro="|x|"]:         {!-- définition par cas --}
  {case: x & \text{si } x \geq 0}
  {case: -x & \text{si } x < 0}
}
```

Le corps des `{line}` / `{case}` est lu **en mode math** : `\text{…}`,
`\frac{…}{…}` et les objets `{@…}` y sont permis.

### Objets maths imbriqués

Une formule peut contenir d'autres objets, résolus en LaTeX avant rendu :
`{@mtb: {@mof:{num:1}{den:2}} \cdot {@mc.pi/}}` → `\frac{1}{2} \cdot \pi`.
Objets utiles : `{@mof}` fraction, `{@mom}` matrice (`{row:1,2}`), `{@mov}`
vecteur colonne (`{c:…}`), `{@mot}` tenseur, `{@moi}` intervalle, `{@mos}`
ensemble, `{@moc}` complexe, `{@qty[value=,unit=]/}` grandeur physique (unité en
romain), constantes `{@mc.pi/}` `{@mc.e/}` `{@mc.i/}` `{@mc.inf/}` `{@mc.phi/}`.

### Chimie

`{@ce: 2 H2 + O2 -> 2 H2O}` → `\ce{…}` (nécessite l'extension **mhchem** de
KaTeX ; charge `contrib/mhchem.min.js`).

### Rendu

Le cœur ne dépend pas de KaTeX. Pour un rendu typographié, passe le module à
`compile`/`render` : `compile(src, { katex: window.katex })`. Sans KaTeX, le
LaTeX brut s'affiche en repli (jamais d'erreur). Les numéros d'équation sont
posés en **HTML/CSS** (via `mathCss`), pas par LaTeX.

## Géométrie

**Règle de contexte** : un objet géométrique **dans** une scène devient une
trace Plotly ; **hors** scène, il rend sa **notation LaTeX** (ex. un plan →
`2x - y + 3z = 5`).

### Décor vs acteurs

Dans une scène on distingue :
- **Décor** (configure le cadre, **au plus un par scène**) : `{@mg2.frame}`
  (alias `repere`) en 2D, `{@mg3.space}` en 3D. Sans décor, défauts raisonnables.
- **Acteurs** (dessinés) : `point`, `circle`, `segment`, `polygon`, `droite`,
  `cpoint` (2D) ; `point`, `vector`, `segment`, `line`, `plane`, `sphere` (3D).

```htsl
{@mg2.scene:
  {@mg2.frame[xrange="(-4,4)", yrange="(-3,3)", grid=true, ticks=1, equal=true]/}
  {@mg2.circle[center="(0,0)", radius=2, color=blue]/}
  {@mg2.point[x=1, y=2, name=A]/}
}
```

`equal=true` (défaut) = repère orthonormé (un cercle reste rond). Plan complexe :
`{@mg2.frame[type=complex, unitcircle=true]/}` + `{@mg2.cpoint[z="3+2i", name=A]/}`.

### Scènes 3D animées (WebGL / Three.js)

La collection **`s3`** décrit des scènes **déclaratives** (zéro `<script>`),
dessinées par le runtime via Three.js (chargé automatiquement) :

```htsl
{@s3.scene[height=480, controls=true, autorotate=true]:
  {@s3.axes[size=3]/}  {@s3.grid[size=12, divisions=12]/}
  {@s3.sphere[radius=0.7, color="#facc15", glow=true]/}
  {@s3.surface[z="sin(x)*cos(y)", xrange="(-3,3)", yrange="(-3,3)"]/}
  {@s3.curve[x="cos(t)", y="sin(t)", z="t/3", trange="(0,18)"]/}
  {@s3.vector[from="(0,0,0)", to="(2,2,1)"]/}
}
```

**Expressions** (`s3.surface`, `s3.curve`, `{@plot}`) : évaluées par un
interpréteur sûr (pas d'`eval`). Opérateurs `+ - * / % ^`, fonctions `sin cos
tan exp log sqrt abs min max …`, constantes `pi e tau phi`.

**Timeline** : donne un `id` aux objets puis pilote-les. Sur une même cible les
animations **s'enchaînent** ; `at`/`delay` pour chevaucher.

```htsl
{@s3.box[id="A", color="#f472b6"]/}
{@s3.sphere[id="B", x=3, color="#60a5fa"]/}
{@s3.animate[target="A", action="move", to="(2,2,0)", duration=2]/}
{@s3.animate[target="A", action="transform", to="B", duration=2]/}  {!-- morph cube→sphère --}
```

Actions : `move`, `rotate` (`axis`,`angle`), `scale` (`value`/`to`), `color`,
`fade` (`value`), `transform` (vrai morph de géométrie vers l'objet `to`).
Options : `duration`, `delay`, `at`, `easing` (`linear`/`easeIn`/`easeOut`/
`easeInOut`). La scène **boucle** par défaut (`loop=false` pour jouer une fois).

## Composants & variables

Résolus par **expansion d'AST avant le rendu** (le renderer ne voit que des
nœuds normaux).

### Composants `{!define}` / `{@use}`

```htsl
{!define card[title, color=indigo]:
  {div[class="card text-{$color}-600"]:
    {h2:{$title}}
    {div.body:{$children}}
  }
}
{@card[title="Bonjour"]: ce contenu remplace children}
```

- Paramètres avec défauts (`color=indigo`) ; un requis manquant = erreur localisée.
- `{$children}` = le contenu passé à l'usage.
- Un composant peut en utiliser d'autres (récursion infinie détectée, prof. 64).
- Utilisable **avant** sa définition (les `!define` sont collectés en 1ʳᵉ passe).
- Le nom partage le registre `@` : collision avec un objet (ex. `mti`) = erreur.

### Variables `{!set}` / `{$var}`

```htsl
{!set theme: indigo}
{p[class="text-{$theme}-600"]:{$theme}}
```

- `{$name}` s'interpole dans le texte, les **valeurs d'attributs** et les corps
  de composants. Portée document, redéfinition autorisée (dernière valeur au
  point d'usage). Variable inconnue = erreur localisée.
- **Valeur brute (LaTeX)** : une valeur **entre guillemets** est prise *verbatim*
  (ses `{` `}` `\` ne sont pas interprétés comme du HTSL) — idéal pour des macros :

```htsl
{!set H: "\tfrac{1}{2}\big(p^2 + \omega^2 q^2\big)"}
{@mte[label=ham]: H = {$H}}
```

## Texte verbatim : `{@codeblock}`, `{script}`, `{style}`

Le corps est lu **tel quel** : les `{ } \ < &` sont préservés, **ne pas
échapper** à la main. `{@codeblock[lang=python]: …}` ajoute une classe
`language-python` (compatible highlight.js). Un `{script:…code…}` inline est
rendu **inerte** (`<script type="text/plain">`, jamais exécuté) ;
`{script[src="…"]/}` externe est permis (chargement de CDN décidé par l'auteur).

## Conversion inverse HTML → HTSL

Pour repartir d'un HTML existant : `fromHtml(html)` → source HTSL
(`htsl_engine.fromHtml` dans le bundle global). Tolérant (ne lève jamais),
referme les balises ouvertes. Limite v0.1 : les espaces purement décoratifs
entre éléments inline peuvent être perdus.

## Pièges courants (à éviter)

1. **Attribut avec espace / virgule / parenthèses / LaTeX non quoté** →
   toujours entre guillemets : `center="(0,0)"`, `title="En bref"`,
   `fn="sin(x)/x"`, `unit="m\cdot s^{-2}"`, `points="(0,0,0);(1,1,0)"`.
2. **Inventer un objet ou un attribut** → vérifie dans `objects.md`. Un attribut
   inconnu d'un `{@frame}` ou un alias erroné ne produit pas ce qu'on croit.
3. **Mélanger les enfants d'un conteneur** → `{@slider}` ne garde que des
   `{@slider.slide}` (le reste est ignoré) ; `{@quiz}` attend `{q}`/`{opt}` ;
   `{@exercise}` reconnaît `{solution:…}` ; `{@document}` attend
   `{@document.page}`. Respecte la structure attendue de chaque objet.
4. **Deux décors dans une scène** (`{@mg2.frame}` ×2) → erreur localisée.
5. **Échapper le contenu d'un `{@codeblock}`/`{script}`/`{style}`** → inutile et
   nuisible : il est verbatim.
6. **Oublier `mathCss` dans une page autonome** → encadrés, slides, numéros
   d'équation et tableaux non stylés. (Voir `templates/standalone.html`.)
7. **Compiler avant le chargement de KaTeX** dans une page autonome → formules en
   LaTeX brut. Compile après `window.load` en passant `{ katex: window.katex }`.
