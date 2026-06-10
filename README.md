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

## L'AST

Chaque nœud porte sa position (`loc: { line, col }`, 1-based). Le texte est un
nœud typé, pas une simple chaîne. Union discriminée `Node` sur le champ `type` :

```ts
type Node = ElementNode | TextNode | CommentNode | ErrorNode;
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
npm test           # 55 tests : lexer, parser, renderer
```

La suite couvre chaque type de token et les positions, tous les cas de syntaxe
et d'erreur, l'échappement XSS, les balises void, le pretty-print, et des
**golden files** (`tests/fixtures/*.htsl` → `*.html`).

## Hors périmètre (v0.1)

Objets spécialisés (`{math.vector:...}`), API de plugins, rendu LaTeX/KaTeX,
CLI complète, playground web, export PDF/JSON.

## Licence

MIT
