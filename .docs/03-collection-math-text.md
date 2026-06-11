# 03 — Collection `math.text.*` + fondation des objets

## Objectif

Ajouter au moteur la collection **`math.text.*`** (alias de collection `mt`)
pour les formulations mathématiques. Comme la fondation nécessaire était
absente du dépôt, ce chantier l'a construite d'abord.

## Fondation construite

### Syntaxe objet `{@chemin:...}`

Nouvelle syntaxe `{@path[attrs]:contenu}` / `{@path[attrs]/}` produisant un
nœud AST `ObjectNode` (`type: "object"`, `path` canonique, `rawPath`, `attrs`,
`selfClosing`, `children`, `loc`).

### Registre + alias (`src/objects/registry.ts`)

- Alias plats : `mti`, `mtb`, `mte`, `mtr`, `mta`, `mtc`, `mts`, `mof`.
- Alias de collection (préfixe) : `mt` → `math.text`, `mc` → `math.constant`,
  `mo` → `math.object` (ex. `mc.pi` → `math.constant.pi`).
- Modèle de contenu par objet : `math` (LaTeX brut + objets imbriqués), `html`
  (enfants HTSL), `void` (auto-fermant).

### Lexer à pile de contextes (`src/lexer.ts`)

Réécrit avec une pile de frames `content` / `header` / `math`. Le frame `math`
lit du LaTeX brut (les `{}` sont des groupes LaTeX littéraux), reconnaît les
objets imbriqués `{@...}`, et suit la profondeur d'accolades. Le choix
math/html au `:` dépend du modèle de contenu du registre.

### Raccourcis `$...$` et `$$...$$`

Lexés en **exactement** la même forme de jetons que `{@math.text.inline:...}`
et `{@math.text.block:...}` → un seul chemin de rendu, zéro duplication.
(`\$` échappe un dollar littéral dans le texte.)

### Couche LaTeX (`src/objects/math.ts`)

- `latexOfObject` / `latexOfNode` : génération LaTeX, résolution récursive des
  objets imbriqués (`{@mof:{num:1}{den:2}}` → `\frac{1}{2}`, `{@mc.pi/}` → `\pi`).
- Environnements : `aligned` (align), `cases` (cases, attr `intro` pour le
  membre de gauche), `\left\{\begin{array}{l}...` (system).
- Contexte document : numérotation séquentielle des `equation`, table des
  labels, résolution des `ref` (label inconnu → `HTSLError` ligne/colonne).
- Rendu : KaTeX si fourni (`options.katex`), sinon fallback LaTeX brut. Le
  numéro d'équation est posé en HTML/CSS à droite (pas via LaTeX).
- `src/objects/css.ts` : feuille de style par défaut (`mathCss`).

## Objets de la collection

| Objet | Alias | Contenu | LaTeX / rendu |
|-------|-------|---------|---------------|
| `math.text.inline` | `mti` | math | formule dans le flux |
| `math.text.block` | `mtb` | math | formule centrée |
| `math.text.equation` | `mte` | math | bloc numéroté (attr `label`) |
| `math.text.ref` | `mtr` | void | `(n)` vers une équation (attr `to`) |
| `math.text.align` | `mta` | html (`{line}`) | environnement `aligned` |
| `math.text.cases` | `mtc` | html (`{case}`) | environnement `cases` (attr `intro`) |
| `math.text.system` | `mts` | html (`{line}`) | système avec accolade |
| `math.object.fraction` | `mof` | html (`{num}`/`{den}`) | `\frac{}{}` |
| `math.constant.pi` | `mc.pi` | void | `\pi` |

## Contenu des lignes

Le contenu des `{line:...}`/`{case:...}` (align/cases/system) est lu en **mode
math** (règle du lexer : les tags `line`/`case` ont un corps LaTeX). Les
accolades LaTeX (`\text{...}`, `\frac{...}{...}`) et les objets imbriqués
`{@...}` y sont donc permis, exactement comme dans inline/block/equation.

## Tests (`tests/math.test.ts`, 18)

Chaque objet, numérotation séquentielle, références (valides/invalides),
imbrication, équivalence AST `$x$` ≡ `{@mti:x}` et `$$x$$` ≡ `{@mtb:x}`,
intégration KaTeX (faux module injecté) + fallback.

## Démo

- `demo-formulas.htsl` (+ `npm run demo:formulas`) : tous les objets.
- `examples/formulas.html` : page navigateur, édition en direct, KaTeX via CDN
  (rendu typographié) ou fallback LaTeX brut, `mathCss` injecté.

## Non-régression

Les 74 tests existants (cœur, renderer, from-html) restent verts. Total : **92**.
