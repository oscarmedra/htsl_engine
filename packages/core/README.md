# HTSL — HyperText Structured Language

> Un langage de balisage léger qui se compile en HTML via un AST.
> **v0.1** · TypeScript strict · zéro dépendance · ESM (navigateur + Node.js).

HTSL remplace le HTML verbeux par une syntaxe concise et structurée :

```htsl
{div.box:
  {h1:Titre}
  {p:Un paragraphe avec du {strong:texte fort} dedans.}
}
```

```html
<div class="box">
  <h1>Titre</h1>
  <p>
    Un paragraphe avec du
    <strong>texte fort</strong>
    dedans.
  </p>
</div>
```

Le moteur est écrit à la main : un **lexer** (tokenisation), un **parser descendant
récursif** (tokens → AST) et un **renderer** (AST → HTML). Aucune dépendance dans le cœur.

---

## Installation

```bash
npm install        # installe les dépendances de développement
npm run build      # compile vers dist/ (ESM + types) via tsup
npm test           # lance la suite Vitest
npm run demo       # compile demo.htsl et affiche le HTML
```

## Syntaxe

| HTSL | HTML |
|------|------|
| `{tag:contenu}` | `<tag>contenu</tag>` |
| `{tag.class1.class2:contenu}` | `<tag class="class1 class2">contenu</tag>` |
| `{tag#monId:contenu}` | `<tag id="monId">contenu</tag>` |
| `{tag[a=1, b="val 2"]:texte}` | `<tag a="1" b="val 2">texte</tag>` |
| `{img[src="a.png"]/}` | `<img src="a.png">` (auto-fermante) |
| `{!-- commentaire --}` | *(aucune sortie)* |

- **Imbrication** illimitée (profondeur max paramétrable, défaut `256`).
- **Combinaison** : `{div#main.box[data-x=1]:...}`.
- **Échappement** dans le texte : `\{`, `\}`, `\:` produisent les caractères
  littéraux `{`, `}`, `:`.

### Grammaire

```ebnf
document   = { node } ;
node       = element | comment | text ;
element    = "{" tag [ id ] { class } [ attrs ] ( ":" content | "/" ) "}" ;
comment    = "{!--" any "--}" ;
tag        = identifier ;
id         = "#" identifier ;
class      = "." identifier ;
attrs      = "[" attr { "," attr } "]" ;
attr       = identifier "=" value ;
content    = { node } ;
identifier = letter { letter | digit | "-" | "_" } ;
```

## Texte brut : `{script:…}` / `{style:…}`

Le corps d'un `{script:…}` ou `{style:…}` est lu **verbatim** (c'est du vrai
JS/CSS, pas du HTSL) : les `{` `}` `<` `&` du code sont préservés. L'accolade
fermante est celle qui **équilibre** l'ouvrante (les `{`/`}` imbriqués sont
comptés ; ceux dans les chaînes, gabarits `` `…` `` et commentaires `//` `/* */`
sont ignorés).

```htsl
{style:.x { color: red; } .y { display: none; }}
{script[src="https://cdn.example/lib.js"]/}   {!-- ressource externe : permise --}
```

**Sécurité — le contenu HTSL ne produit jamais de JS exécutable.**

- `{style:…}` est rendu tel quel (CSS, non exécutable).
- `{script[src=…]/}` (ressource **externe**, sans corps) est rendu en
  `<script src>` : c'est un chargement de CDN décidé par l'auteur.
- un `{script: …code…}` **inline** est rendu **inerte** :
  `<script type="text/plain">…</script>` (jamais exécuté ; `</script>` est
  neutralisé). Le comportement dynamique passe par des nœuds de données +
  [le runtime](#runtime-navigateur), pas par du JS émis dans le HTML.

`allowedTags` peut en plus interdire totalement `script`/`style`.

## API

```ts
import { parse, render, compile } from "htsl";

// Parse → AST (tableau de nœuds)
const ast = parse("{p:Bonjour}", { mode: "strict" });

// AST → HTML
const html = render(ast, { prettyPrint: true });

// parse + render en un appel
const out = compile("{p:Bonjour}");
```

### Objet moteur `htsl_engine`

Pour un usage en namespace (`htsl_engine.compile(...)`), le moteur est aussi
exposé comme objet — disponible en ESM comme export par défaut **et** nommé :

```ts
import htsl_engine from "htsl";        // export par défaut
// ou : import { htsl_engine } from "htsl";

htsl_engine.compile("{p:Bonjour}");
htsl_engine.parse("{p:x}");
htsl_engine.render(ast, { prettyPrint: true });
```

### Build minifié & usage navigateur

```bash
npm run build:min   # génère dist-min/htsl.min.js (ESM) + dist-min/htsl.global.js (IIFE)
```

Dans une page HTML, le bundle global expose `htsl_engine` (et l'alias
majuscule `HTSL_ENGINE`) :

```html
<script src="htsl.global.js"></script>
<script>
  document.body.innerHTML = htsl_engine.compile("{p.box:Bonjour}", { prettyPrint: true });
  // HTSL_ENGINE.compile(...) fonctionne aussi (même objet)
</script>
```

Voir [`examples/browser.html`](examples/browser.html) pour une démo en direct.

### `parse(source, options?)` → `Node[]`

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `mode` | `"strict" \| "tolerant"` | `"strict"` | `strict` lève une `HTSLError` à la première erreur ; `tolerant` insère un nœud `{ type: "error" }` et poursuit. |
| `maxDepth` | `number` | `256` | Profondeur d'imbrication maximale. |

### `render(ast, options?)` → `string`

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `prettyPrint` | `boolean` | `false` | Indentation 2 espaces (sinon sortie compacte). |
| `allowedTags` | `string[]` | — | Si fourni, toute balise hors liste est rendue comme **texte échappé**. |

### `compile(source, options?)` → `string`

Combine `parse` et `render` (accepte les options des deux).

## Objets & formules mathématiques

Les objets utilisent la syntaxe `{@chemin[attrs]:contenu}` (ou `{@chemin/}`
auto-fermant), avec un système d'alias. La collection **`math.text.*`** (alias
de collection `mt`) couvre les formulations mathématiques.

```htsl
{p:Inline : {@mti: a^2 + b^2 = c^2}, ou en raccourci $e^{i\pi}+1=0$.}
{@mtb: \sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}}
{@mte[label=euler]: e^{i\pi} + 1 = 0}
{p:Voir {@mtr[to=euler]/}.}
```

| Objet | Alias | Description |
|-------|-------|-------------|
| `math.text.inline` | `mti` | formule dans le flux du texte |
| `math.text.block` | `mtb` | formule centrée sur sa ligne |
| `math.text.equation` | `mte` | bloc numéroté `(n)` (attr `label`) |
| `math.text.ref` | `mtr` | référence croisée `(n)` (attr `to`) |
| `math.text.align` | `mta` | équations alignées (`{line:...}`) |
| `math.text.cases` | `mtc` | définition par cas (`{case:...}`, attr `intro`) |
| `math.text.system` | `mts` | système avec accolade (`{line:...}`) |
| `math.object.fraction` | `mof` | `\frac{}{}` (`{num:...}`/`{den:...}`) |
| `math.constant.pi` | `mc.pi` | `\pi` |

**Unification** : `$...$` et `$$...$$` produisent exactement les mêmes nœuds AST
que `{@mti:...}` et `{@mtb:...}` (un seul chemin de rendu). `\$` échappe un
dollar littéral.

**Imbrication** : une formule peut contenir d'autres objets, résolus en LaTeX
avant le rendu — `{@mtb: {@mof:{num:1}{den:2}} \cdot {@mc.pi/}}` produit
`\frac{1}{2} \cdot \pi`.

**Rendu** : passez le module KaTeX via `render(ast, { katex })` (peerDependency
optionnelle) pour un rendu typographié ; sinon le LaTeX brut est affiché en
repli. Le numéro d'équation est posé en HTML/CSS (pas via LaTeX). Injectez la
feuille de style par défaut exportée sous `mathCss`.

```ts
import katex from "katex";
import { compile, mathCss } from "htsl";

compile("{@mte[label=e]: E = mc^2}", { katex });
```

Le contenu des lignes `{line}`/`{case}` (align/cases/system) est lu en **mode
math** : les accolades LaTeX (`\text{...}`, `\frac{...}{...}`) et les objets
`{@...}` y sont permis, comme dans inline/block/equation.

## Géométrie (Plotly)

Les objets géométriques se déclarent dans un conteneur `scene` (2D ou 3D). Pas
d'appel de fonction : c'est le conteneur qui déclenche le rendu graphique.

```htsl
{@mg3.scene[width=600, height=400]:
  {@mg3.plane[normal="(2,-1,3)", d=5, color=blue, opacity=0.5]/}
  {@mg3.point[name=A, x=1, y=2, z=3, color=red]/}
  {@mg3.vector[from="(1,2,3)", to="(1,3,4)"]/}
  {@mg3.sphere[center="(0,0,0)", radius=2]/}
}
```

**Règle de contexte** : un objet géométrique *dans* une scène devient une trace
Plotly ; *hors* scène, il rend sa **notation LaTeX** (ex. un plan →
`2x - y + 3z = 5`). Aucune régression LaTeX.

### Décor vs. acteurs

Dans une scène, on distingue deux familles :

- **Décor** — configure le *cadre mathématique* : `mg2.frame` (alias `repere`)
  et `mg3.space`. **Au plus un par scène** (un second est une erreur localisée).
  Pris en compte quelle que soit sa position parmi les enfants. Sans décor, la
  scène garde des défauts raisonnables (comportement inchangé).
- **Acteurs** — sont *dessinés* : `point`, `circle`, `plane`, `sphere`, etc.

Le repère est un **objet structuré déclaratif** qui décrit le cadre ; sa
traduction Plotly (ranges, `scaleanchor`, `aspectmode`, gridlines…) n'est qu'un
rendu parmi d'autres.

```htsl
{@mg2.scene:
  {@mg2.frame[xrange="(-4,4)", yrange="(-3,3)", grid=true, ticks=1, equal=true]/}
  {@mg2.circle[center="(0,0)", radius=2]/}
}
```

| Décor | Attributs |
|-------|-----------|
| `mg2.frame` / `repere` | `xrange`, `yrange`, `grid`, `ticks`, `equal` (défaut **true** = orthonormé, un cercle reste rond), `axes`, `labels` |
| `mg2.frame[type=complex]` | plan complexe : axes `Re(z)`/`Im(z)`, `range`, `unitcircle=true` (cercle unité en pointillés) |
| `mg3.space` | `xrange`, `yrange`, `zrange`, `grid`, `ticks`, `equal` (aspectmode), `labels` (défaut `"x,y,z"`) |

L'acteur `mg2.cpoint[z="3+2i", name=A]` place un point d'affixe complexe
(formes `a+bi`, `a-bi`, `bi`, `a`, signes négatifs).

| Collection | Objets (acteurs) |
|------------|------------------|
| `mg2.scene` (2D) | `point`, `cpoint`, `segment`, `circle`, `polygon`, `droite` |
| `mg3.scene` (3D) | `point`, `vector` (flèche + cône), `segment`, `line`, `plane` (surface), `sphere` (surface paramétrique) |

Attributs visuels communs : `color`, `opacity`, `label`/`name`.

**Rendu déclaratif** : le cœur ne dépend jamais de Plotly et le renderer
n'émet **aucun `<script>`**. Chaque scène est un nœud porteur de données
`<div class="htsl-scene" data-htsl-scene='{…}' data-htsl-hash="…">` + un message
de repli (pattern générique pour tout type dynamique : `class htsl-<type>` +
`data-htsl-<type>`). C'est [le runtime](#runtime-navigateur) qui les dessine.

L'API expose aussi `toPlotly(node, dim)` et `sceneSpec(node)` (JSON pur), ainsi
que `hydrateScenes(root?, Plotly?)` (dessin bas niveau, si vous fournissez
vous-même Plotly).

### Scènes 3D animées (WebGL / Three.js)

Pour du 3D animé libre (au-delà des surfaces mathématiques de Plotly), la
collection **`s3`** (`scene.3d`) décrit des scènes **déclaratives** dessinées par
le runtime via Three.js — toujours **zéro `<script>`** :

```htsl
{@s3.scene[height=480, controls=true, autorotate=true]:
  {@s3.axes[size=3]/}  {@s3.grid[size=12, divisions=12]/}
  {@s3.sphere[radius=0.7, color="#facc15", glow=true]/}          {!-- soleil --}
  {@s3.torus[radius=1.4, tube=0.18, color="#34d399", spin=0.01]/}
  {@s3.vector[from="(0,0,0)", to="(2,2,1)", color="#f59e0b"]/}    {!-- force --}
  {@s3.line[points="(-3,0,0);(-2,1,1);(-1,0,2)", color="#22d3ee"]/}  {!-- trajectoire --}
  {@s3.point[color="#f87171", orbit=2.2, speed=0.03]/}            {!-- particule --}
}
```

| Objet | Rôle |
|-------|------|
| `s3.scene` | conteneur → `<div class="htsl-three" data-htsl-three='{…}'>`. Attrs : `width`, `height`, `background`, `distance` (caméra), `controls` (rotation souris / OrbitControls), `autorotate`. |
| `s3.sphere` `s3.box` `s3.torus` `s3.cylinder` `s3.cone` `s3.plane` `s3.point` | formes (maillages) |
| `s3.vector` | flèche `from`→`to` (forces, champs, déplacements) |
| `s3.line` | ligne/trajectoire (`points="(x,y,z);(x,y,z);…"`) |
| `s3.surface` | **surface `z = f(x, y)`** (`z="sin(x)*cos(y)"`, `xrange`, `yrange`, `res`) |
| `s3.curve` | **courbe paramétrique** `(x(t), y(t), z(t))` (`x`, `y`, `z`, `trange`, `samples`) |
| `s3.axes` `s3.grid` | repère et grille de référence |

### Fonctions & expressions

`s3.surface`, `s3.curve` et le graphe 2D acceptent des **expressions
mathématiques** (`sin(x)*cos(y)`, `cos(t)`, `sin(x)/x`…) évaluées par un petit
**interpréteur sûr** (`compileExpr` / `safeExpr`, exporté) : aucun `eval`, aucun
accès au global — le moteur échantillonne la fonction et n'émet que des
**données**. Opérateurs `+ - * / % ^`, fonctions usuelles (`sin cos tan exp log
sqrt abs min max …`), constantes (`pi e tau phi`).

### Graphe de fonction 2D

`{@plot[fn="sin(x)/x", xrange="(-15,15)", title="…"]}` trace une fonction
`y = f(x)` : échantillonnée par l'interpréteur, rendue via le même chemin
déclaratif Plotly que les scènes (nœud `htsl-scene`, **zéro `<script>`**).

Transforms communs (maillages) : `x`/`y`/`z`, `color`, `opacity`, `glow`
(auto-lumineux), `spin` (rotation propre), `orbit`+`speed` (orbite).

Le runtime charge Three.js (et OrbitControls si `controls`), construit la scène,
lance une boucle `requestAnimationFrame`, **reconstruit** au changement de hash
(Three n'a pas de `react`) et **libère le contexte WebGL** (`forceContextLoss`) à
la purge — d'où aucune fuite après des dizaines d'éditions.

## Runtime navigateur

Comme le renderer ne produit que des **données** (jamais de JS exécutable), un
**runtime unique** donne vie au HTML. Il est livré avec le moteur (`window.HTSL`
une fois installé) et c'est la **seule** couche JS que le moteur exécute.

```ts
import { hydrate, purge, loadDependency, installHtslRuntime } from "htsl";
```

| Fonction | Rôle |
|----------|------|
| `loadDependency(url, win?)` | Charge un script externe **une fois par (fenêtre, URL)** : la `Promise` est mise en cache → jamais de double chargement ni de course. Chaque type dynamique déclare sa dépendance (Plotly pour les scènes math, Three.js pour les scènes 3D animées ; KaTeX à venir). |
| `hydrate(root, win?)` | Scanne les nœuds `htsl-*`, charge la dépendance **seulement s'il y a du travail**, initialise ce qui ne l'est pas, marque chaque nœud (`data-htsl-init="<hash>"`). **Idempotent** : rappeler est toujours sûr. Hash changé → `Plotly.react` (jamais destroy + `newPlot`) ; hash inchangé → **strictement rien**. |
| `purge(removed, win?)` | Libère les ressources (`Plotly.purge`) des scènes retirées/remplacées — à appeler avant qu'elles quittent le DOM (évite les fuites). |
| `installHtslRuntime(win?)` | Installe le runtime comme **unique** global `window.HTSL`, hydrate au `DOMContentLoaded`, et garde tout synchronisé via un `MutationObserver` (purge les scènes retirées puis ré-hydrate). Idéal pour une page statique. |

Intégré (ex. le playground) : appelez `hydrate(conteneur, iframeWindow)` après
chaque mise à jour du DOM — il charge Plotly dans cette fenêtre et est idempotent.

## Composants & variables

Fidèles à la philosophie « tout est objet structuré », les composants et les
variables sont **résolus par expansion d'AST avant le rendu** (le renderer ne
voit que des nœuds normaux).

### Composants

```htsl
{!define card[title, color=indigo]:
  {div[class="card text-{$color}-600"]:
    {h2:{$title}}
    {div.body:{$children}}
  }
}

{@card[title="Bonjour"]:contenu injecté dans {$children}}
```

- Paramètres avec valeurs par défaut (`color=indigo`) ; un paramètre obligatoire
  manquant est une **erreur localisée**.
- `{$children}` reçoit le contenu passé à l'usage.
- Un composant peut en utiliser d'autres ; la **récursion infinie est détectée**
  (profondeur max 64).
- Un composant peut être **utilisé avant sa définition** (les `!define` sont
  collectés en première passe).
- Les noms de composants partagent le registre `@` : une **collision avec un
  objet enregistré** (ex. `mti`) est une erreur.

### Variables

```htsl
{!set theme-color: indigo}
{p[class="text-{$theme-color}-600"]:{$theme-color}}
```

- `{$name}` s'interpole dans le texte, les **valeurs d'attributs** et les corps
  de composants.
- Portée document, redéfinition autorisée (**dernière valeur au point d'usage**).
- Une **variable inconnue** est une erreur localisée.

L'expansion est exposée via `expand(ast, { source? })` ; `compile`/`render`
l'exécutent automatiquement avant le rendu.

### Conversion inverse : HTML → HTSL

Le moteur sait aussi reconvertir du HTML en HTSL, via un petit parser HTML
maison (zéro dépendance, Node + navigateur) :

```ts
import { fromHtml, parseHtml, toHtsl } from "htsl";

fromHtml('<div class="box"><p>Salut</p></div>');
// → "{div.box:\n  {p:Salut}\n}"

const ast = parseHtml("<ul><li>a</li><li>b</li></ul>"); // HTML → AST
toHtsl(ast, { prettyPrint: false });                    // AST → HTSL  →  "{ul:{li:a}{li:b}}"
```

| Fonction | Rôle |
|----------|------|
| `parseHtml(html)` | HTML → AST (`Node[]`) |
| `toHtsl(ast, { prettyPrint? })` | AST → source HTSL |
| `fromHtml(html, options?)` | HTML → HTSL (les deux d'un coup) |

La conversion gère les éléments, les attributs (quotés, non quotés, booléens),
les balises void, les commentaires, le doctype (ignoré) et les entités HTML
courantes. Elle est tolérante (ne lève jamais d'exception) et referme
automatiquement les balises laissées ouvertes.

> **Limite v0.1** : les espaces purement décoratifs entre éléments inline
> peuvent être perdus (les nœuds texte vides sont supprimés). Le contenu
> textuel significatif et l'échappement, eux, font un aller-retour fidèle.

## Introspection & métadonnées d'authoring

Le moteur tient un **registre des objets `@`** introspectable, source unique de
vérité pour les outils (autocomplétion, palette du playground) — aucune liste
n'est codée en dur ailleurs.

```ts
import { registry, parse } from "htsl";

registry.list();            // toutes les entrées (objets + éléments HTML courants)
registry.describe("mte");   // métadonnées d'une entrée (alias résolu)
registry.components(ast);   // composants {!define} d'un document parsé
registry.variables(ast);    // variables {!set} d'un document
```

Chaque entrée porte des **métadonnées riches** :

| Champ | Description |
|-------|-------------|
| `path` / `aliases` | chemin canonique (`math.text.equation`) et alias (`mte`) |
| `kind` | `"object"` (objet `@`) ou `"element"` (balise HTML courante : `h1`, `p`, `ul`, `table`…). Les éléments sont **introspectables mais n'affectent pas le langage** : `{h1:…}` reste une simple balise, jamais un objet `@`. |
| `category` | `structure \| formules \| géométrie \| document` (pour classer la palette) |
| `description` | phrase lisible |
| `attrs` | schéma des attributs : `name`, `type`, `required`, `default`, `description` |
| `snippet` | gabarit d'insertion avec **marqueurs de trous** CodeMirror, ex. `"{@mte[label=${1:label}]: ${2:formule}}"` |
| `example` | exemple compilable (sert d'aperçu) |

Ces métadonnées alimentent directement `@htsl/codemirror` (snippets, commande
slash) et la palette du playground.

## Plages source & rendu éditable

Pour éditer le rendu et réécrire le source, le moteur peut attacher des **plages
source absolues** aux nœuds :

```ts
const ast = parse(src, { ranges: true }); // off par défaut → AST inchangé
// → les nœuds `text`, `element` et `object` portent `range: [start, end]`
```

- La plage d'un **texte** couvre le texte brut (échappements compris) ; celle
  d'un **élément/objet** couvre tout le `{…}` / `{@…}`.
- Au rendu, `render(ast, { editableText: true })` enveloppe chaque texte
  source-backé dans `<span class="htsl-edit" data-htsl-text="start-end">` et
  émet `data-htsl-range="start-end"` sur les éléments. Un outil (cf. le
  playground) mappe alors un clic du rendu vers la portion de source à réécrire.
  Les textes issus de variables/composants n'ont pas de plage (non éditables
  individuellement) ; le contenu math n'est pas enveloppé.

## L'AST

Chaque nœud porte sa position (`loc: { line, col }`, 1-based). Le texte est un
nœud typé, pas une simple chaîne. Union discriminée `Node` sur le champ `type` :

```ts
type Node = ElementNode | TextNode | CommentNode | ObjectNode
          | DefineNode | SetNode | VarRefNode | ErrorNode;
```

```json
{
  "type": "element",
  "tag": "div",
  "id": null,
  "classes": ["box"],
  "attrs": {},
  "selfClosing": false,
  "children": [
    { "type": "text", "value": "Bonjour", "loc": { "line": 1, "col": 6 } }
  ],
  "loc": { "line": 1, "col": 1 }
}
```

## Sécurité

- **Échappement par défaut** de tout contenu textuel et de toute valeur
  d'attribut (`<`, `>`, `&`, `"` → entités HTML). C'est non négociable
  (prévention XSS).

  ```ts
  compile("{p:<script>alert(1)</script>}");
  // → "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"
  ```

- **Balises void** (`img`, `br`, `hr`, `input`, `meta`, `link`…) rendues sans
  balise fermante.
- **`allowedTags`** : une liste blanche qui transforme toute balise non autorisée
  en texte inerte échappé.

## Gestion des erreurs

`HTSLError` expose `message`, `line`, `col` et un extrait du source avec un
curseur `^` :

```
HTSL Error (ligne 4, col 3) : balise "{p" jamais fermée.
  4 |   {p:Texte sans fermeture
    |   ^
```

Erreurs détectées : accolade jamais fermée, accolade fermante orpheline,
attribut malformé, identifiant invalide, profondeur maximale dépassée.

En mode `tolerant`, aucune entrée malformée ne provoque d'exception : l'erreur
est matérialisée par un nœud `{ type: "error" }` dans l'AST.

## Tests

```bash
npm test           # 184 tests : lexer, parser, renderer, objets, introspection…
```

La suite couvre chaque type de token et les positions, tous les cas de syntaxe
et d'erreur, l'échappement XSS, les balises void, le pretty-print, les objets
math/géométrie, les composants/variables, l'introspection (métadonnées + chaque
exemple qui compile), les plages source/rendu éditable, et des **golden files**
(`tests/fixtures/*.htsl` → `*.html`).

## Hors périmètre (cœur)

Le rendu KaTeX/Plotly est délégué à la page (peerDependencies, voir plus haut) ;
le cœur n'en dépend jamais. Hors scope du paquet : API de plugins tierce, CLI
complète, export PDF. Le playground et les extensions d'éditeur vivent dans les
autres paquets du monorepo.

## Licence

MIT
