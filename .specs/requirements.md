# Specifications – HTSL Engine → HTML (and structured objects)

> **Document version:** 1.1 · **Date:** June 2026 · **Status:** Enriched draft

---

## 1. Introduction

This document describes the specifications for an engine called **HTSL (HyperText Structured Language)**.

The goal of the engine is to transform structured text into a usable representation:

- HTML for web rendering
- internal structure (AST) for logical manipulation
- possible extensions (math, objects, interactive components)

---

## 2. Engine objective

The HTSL engine should enable:

- Writing structured content in a simple way
- Replacing complex HTML with a more readable syntax
- Describing objects (math, UI, tables, etc.)
- Automatically generating valid HTML
- Supporting nested structures
- Allowing future extension toward an interactive system

---

## 3. HTSL language philosophy

HTSL is a language based on a logic:

> “Everything is a structured object”

Example:

```text
{div[class="box"]:
  {p:Bonjour}
}
```

is equivalent to:

```html
<div class="box">
  <p>Bonjour</p>
</div>
```

---

## 4. General syntax

### 4.1 Basic structure

```text
{tag:content}
```

### 4.2 With classes

```text
{tag.class1.class2:content}
```

### 4.3 With attributes

```text
{tag[attr1=val1, attr2=val2]:content}
```

### 4.4 With identifier *(enhancement)*

```text
{tag#myId.class1:content}
```

### 4.5 Nesting

```text
{div:
  {p:Text}
  {span.red:Important}
}
```

### 4.6 Escaping special characters *(enhancement)*

Because `{`, `}` and `:` are significant, the language must define an escaping mechanism:

```text
{p:Here is a literal brace \{ and a colon \: in the text}
```

### 4.7 Self-closing tags *(enhancement)*

```text
{img[src="photo.png", alt="A photo"]/}
{br/}
{hr/}
```

### 4.8 Comments *(enhancement)*

```text
{!-- This is a comment, ignored by the renderer --}
```

### 4.9 Specialized objects

HTSL allows defining logical objects:

```text
{math.vector:
  {component:x=1}
  {component:y=2}
  {component:z=3}
}
```

---

## 5. Formal grammar *(enhancement)*

To guarantee unambiguous parsing, the syntax must be defined by a formal grammar (EBNF):

```ebnf
document   = { node } ;
node       = element | text ;
element    = "{" tag [ id ] { class } [ attrs ] ( ":" content | "/" ) "}" ;
tag        = identifier { "." identifier } ;
id         = "#" identifier ;
class      = "." identifier ;
attrs      = "[" attr { "," attr } "]" ;
attr       = identifier "=" value ;
content    = { node } ;
identifier = letter { letter | digit | "-" | "_" } ;
```

This grammar serves as the single reference for parser implementation and test writing.

---

## 6. HTSL engine (architecture)

The engine is composed of 4 main steps *(the lexer was added as an enhancement — it makes parsing more robust than a character-by-character approach)*:

```text
HTSL Text
   ↓
Lexer (tokenization)
   ↓
Parser
   ↓
AST (Abstract Syntax Tree)
   ↓
Renderer HTML / Object Model
```

### 6.1 Lexer *(enhancement)*

The lexer breaks the source text into tokens:

| Token | Example |
|---|---|
| `BRACE_OPEN` | `{` |
| `BRACE_CLOSE` | `}` |
| `COLON` | `:` |
| `DOT` | `.` |
| `HASH` | `#` |
| `BRACKET_OPEN` / `BRACKET_CLOSE` | `[` `]` |
| `IDENTIFIER` | `div`, `class1` |
| `TEXT` | textual content |

---

## 7. Parser

### Role

The parser must:

- analyze the token sequence
- detect tags
- extract identifiers, classes, attributes, and content
- handle nesting
- **produce clear, localized errors** *(enhancement, see §8)*

### Output

The parser produces an AST. Each node carries its **position in the source** (line, column) to facilitate debugging *(enhancement)*:

```json
{
  "type": "element",
  "tag": "div",
  "attrs": { "class": "box" },
  "children": [
    {
      "type": "element",
      "tag": "p",
      "children": [
        { "type": "text", "value": "Bonjour" }
      ],
      "loc": { "line": 2, "col": 3 }
    }
  ],
  "loc": { "line": 1, "col": 1 }
}
```

> **Note (enhancement):** text is represented by a node `{ "type": "text", "value": ... }` rather than a simple string. This makes the AST homogeneous and simplifies visitors/transformations.

---

## 8. Error handling *(enhancement)*

A language without good error messages is unusable. The engine must:

- Detect unclosed braces and indicate the **line and column** of the orphan opening
- Report malformed attributes (`[attr=]`, missing comma, etc.)
- Offer two modes:
  - **strict**: any error stops rendering (ideal in CI / build)
  - **lenient**: the engine attempts recovery and inserts an `error` node in the AST (ideal for live editor)

Expected message example:

```text
HTSL Error (line 4, col 3): tag "{p" never closed.
  Opened here:
  4 |   {p:Text without closure
    |   ^
```

---

## 9. Renderer

### Role

Transform the AST into:

- HTML
- or usable objects

### Security: HTML escaping *(major enhancement)*

The HTML renderer must **escape by default** all textual content (`<`, `>`, `&`, `"`) to prevent XSS injection. An explicit option (`raw: true` or an object `{html.raw:...}`) will allow inserting raw HTML knowingly.

### Tag whitelist *(enhancement)*

In “untrusted content” mode, the renderer can restrict allowed tags (no `script`, `iframe`, `on*` attributes, etc.).

### Example

AST → HTML:

```html
<div class="box">
  <p>Bonjour</p>
</div>
```

---

## 10. Object support (advanced feature)

HTSL allows defining structured objects.

### Vector example

```text
{math.vector:
  {component:x=1}
  {component:y=2}
  {component:z=3}
}
```

### Objective

These objects can be:

- displayed (HTML)
- computed (JS)
- transformed (future math engine)

### Object plugin system *(enhancement)*

Each object type is registered through a clear API, rather than hard-coded into the engine:

```js
htsl.registerObject("math.vector", {
  parse(node) { /* specialized AST */ },
  render(obj) { /* HTML */ },
  evaluate(obj) { /* JS value, optional */ }
});
```

---

## 11. Math support

HTSL should be able to integrate:

- inline LaTeX: `$x^2$`
- blocks: `$$x^2 + 1$$`

Rendering may be handled by:

- MathJax
- KaTeX *(recommended by default: lighter and faster; MathJax optional for extended LaTeX coverage)*

---

## 12. Technical constraints

- Support infinite nesting *(practically: configurable depth, default 256, to avoid stack overflows — enhancement)*
- Robust parsing (not based only on regex) — **a real lexer + recursive descent parser**
- Acceptable performance on long documents *(target: < 50 ms for a 100 KB document on a standard machine — enhancement)*
- Modular architecture (lexer / parser / renderer separated)
- **Zero dependencies** for the core engine *(enhancement)*; KaTeX/MathJax loaded only if needed
- Works in **browser and Node.js** (single ESM module) *(enhancement)*

---

## 13. Tests and quality *(enhancement)*

- **Unit tests**: lexer, parser, renderer tested separately
- **Regression tests**: corpus of `.htsl` files with expected HTML outputs (golden files)
- **Light fuzzing**: random/malformed inputs must never crash the engine (clean error, never an unhandled exception)
- **Edge cases to cover from v0.1**: braces nested inside attributes, empty content, spaces/newlines, Unicode characters

---

## 14. Extensibility

The engine must allow:

- Adding new object types (math, ui, table, etc.) via the plugin API (§10)
- Rendering plugins
- Transformation to other formats (PDF, JSON, Markdown, etc.)
- **Generic AST visitors** *(enhancement)*: a standard `walk(ast, visitor)` function for easy transformation writing

---

## 15. Tooling *(enhancement)*

To encourage adoption:

- **CLI**: `htsl build file.htsl -o file.html`
- **Web playground**: HTSL input area + live HTML/AST preview (excellent test and demo tool)
- **Syntax highlighting**: TextMate grammar (VS Code) as a bonus
- **Formatter**: `htsl fmt` to normalize indentation

---

## 16. Roadmap (revised)

| Version | Feature |
|---|---|
| 0.1 | Lexer + parser: `{tag:content}`, text nodes, localized errors |
| 0.2 | Classes and identifiers (`.class`, `#id`) |
| 0.3 | Attributes `[attr=val]`, escaping `\{` `\}` `\:` |
| 0.4 | Full nesting, self-closing tags, comments |
| 0.5 | Secure HTML renderer (escaping XSS), plugin API |
| 0.6 | Math objects (vector, matrix), KaTeX rendering |
| 0.7 | CLI + web playground |
| 1.0 | Complete stable engine, documentation, test suite |

---

## 17. Positioning versus existing solutions *(enhancement)*

To clarify HTSL’s added value compared to existing solutions:

| Language | Strengths | What HTSL adds |
|---|---|---|
| Markdown | simplicity | arbitrary structure, attributes, objects |
| Pug | concise HTML | brace syntax (no significant indentation), logical objects |
| JSX | components | no build required, readable by non-developers |

This analysis should guide syntax choices so as not to reinvent what already exists without benefit.

---

## 18. Project vision

HTSL aims to become:

- a document structuring language
- a system of embedded objects in text
- a foundation for an interactive scientific editor

> **Note (amélioration) :** le texte est représenté par un nœud `{ "type": "text", "value": ... }` plutôt qu'une simple chaîne. Cela rend l'AST homogène et simplifie les visiteurs/transformations.

---

## 8. Gestion des erreurs *(amélioration)*

Un langage sans bons messages d'erreur est inutilisable. Le moteur doit :

- Détecter les accolades non fermées et indiquer **ligne et colonne** de l'ouverture orpheline
- Signaler les attributs malformés (`[attr=]`, virgule manquante, etc.)
- Proposer deux modes :
  - **strict** : toute erreur arrête le rendu (idéal en CI / build)
  - **tolérant** : le moteur tente de récupérer et insère un nœud `error` dans l'AST (idéal en éditeur live)

Exemple de message attendu :

```text
HTSL Error (ligne 4, col 3) : balise "{p" jamais fermée.
  Ouverte ici :
  4 |   {p:Texte sans fermeture
    |   ^
```

---

## 9. Renderer

### Rôle

Transformer l'AST en :

- HTML
- ou objets exploitables

### Sécurité : échappement HTML *(amélioration majeure)*

Le renderer HTML doit **échapper par défaut** tout contenu textuel (`<`, `>`, `&`, `"`) pour prévenir les injections XSS. Une option explicite (`raw: true` ou un objet `{html.raw:...}`) permettra d'insérer du HTML brut en connaissance de cause.

### Liste blanche de balises *(amélioration)*

En mode « contenu non fiable », le renderer peut restreindre les balises autorisées (pas de `script`, `iframe`, attributs `on*`, etc.).

### Exemple

AST → HTML :

```html
<div class="box">
  <p>Bonjour</p>
</div>
```

---

## 10. Support des objets (feature avancée)

HTSL permet de définir des objets structurés.

### Exemple vectoriel

```text
{math.vector:
  {component:x=1}
  {component:y=2}
  {component:z=3}
}
```

### Objectif

Ces objets peuvent être :

- affichés (HTML)
- calculés (JS)
- transformés (math engine futur)

### Système de plugins d'objets *(amélioration)*

Chaque type d'objet est enregistré via une API claire, plutôt que codé en dur dans le moteur :

```js
htsl.registerObject("math.vector", {
  parse(node) { /* AST spécialisé */ },
  render(obj) { /* HTML */ },
  evaluate(obj) { /* valeur JS, optionnel */ }
});
```

---

## 11. Support des mathématiques

HTSL doit pouvoir intégrer :

- LaTeX inline : `$x^2$`
- blocs : `$$x^2 + 1$$`

Le rendu peut être assuré par :

- MathJax
- KaTeX *(recommandé par défaut : plus léger et plus rapide ; MathJax en option pour la couverture LaTeX étendue)*

---

## 12. Contraintes techniques

- Support de l'imbrication infinie *(en pratique : profondeur paramétrable, défaut 256, pour éviter les débordements de pile — amélioration)*
- Parsing robuste (pas basé uniquement sur des regex) — **un vrai lexer + parser descendant récursif**
- Performance acceptable sur documents longs *(objectif chiffré : < 50 ms pour un document de 100 Ko sur machine standard — amélioration)*
- Architecture modulaire (lexer / parser / renderer séparés)
- **Zéro dépendance** pour le cœur du moteur *(amélioration)* ; KaTeX/MathJax chargés uniquement si nécessaires
- Fonctionnement **navigateur et Node.js** (module ESM unique) *(amélioration)*

---

## 13. Tests et qualité *(amélioration)*

- **Tests unitaires** : lexer, parser, renderer testés séparément
- **Tests de non-régression** : corpus de fichiers `.htsl` avec sorties HTML attendues (golden files)
- **Fuzzing léger** : entrées aléatoires/malformées ne doivent jamais faire planter le moteur (erreur propre, jamais d'exception non gérée)
- **Cas limites à couvrir dès la v0.1** : accolades imbriquées dans les attributs, contenu vide, espaces/sauts de ligne, caractères Unicode

---

## 14. Extensibilité

Le moteur doit permettre :

- Ajout de nouveaux types d'objets (math, ui, table, etc.) via l'API de plugins (§10)
- Plugins de rendu
- Transformation vers d'autres formats (PDF, JSON, Markdown, etc.)
- **Visiteurs d'AST génériques** *(amélioration)* : une fonction `walk(ast, visitor)` standard pour écrire facilement des transformations

---

## 15. Outillage *(amélioration)*

Pour favoriser l'adoption :

- **CLI** : `htsl build fichier.htsl -o fichier.html`
- **Playground web** : zone de saisie HTSL + aperçu HTML/AST en direct (excellent outil de test et de démonstration)
- **Coloration syntaxique** : grammaire TextMate (VS Code) en bonus
- **Formateur** : `htsl fmt` pour normaliser l'indentation

---

## 16. Roadmap (révisée)

| Version | Fonctionnalité |
|---|---|
| 0.1 | Lexer + parser : `{tag:contenu}`, nœuds texte, erreurs localisées |
| 0.2 | Classes et identifiants (`.class`, `#id`) |
| 0.3 | Attributs `[attr=val]`, échappement `\{` `\}` `\:` |
| 0.4 | Imbrication complète, balises auto-fermantes, commentaires |
| 0.5 | Renderer HTML sécurisé (échappement XSS), API de plugins |
| 0.6 | Objets math (vector, matrix), rendu KaTeX |
| 0.7 | CLI + playground web |
| 1.0 | Moteur stable complet, documentation, suite de tests |

---

## 17. Positionnement par rapport à l'existant *(amélioration)*

Pour clarifier la valeur ajoutée d'HTSL face aux solutions existantes :

| Langage | Forces | Ce qu'HTSL apporte en plus |
|---|---|---|
| Markdown | simplicité | structure arbitraire, attributs, objets |
| Pug | HTML concis | syntaxe par accolades (pas d'indentation significative), objets logiques |
| JSX | composants | aucun build requis, lisible par des non-développeurs |

Cette analyse devra guider les choix de syntaxe pour ne pas réinventer ce qui existe sans bénéfice.

---

## 18. Vision du projet

HTSL a pour objectif de devenir :

- un langage de structuration de documents
- un système d'objets intégrés dans le texte
- une base pour un éditeur scientifique interactif

---

## 19. Conclusion

Le moteur HTSL transforme une idée simple :

> écrire du contenu structuré facilement

en un système capable de :

- générer du HTML **sûr** (échappement par défaut)
- représenter des objets complexes
- supporter des mathématiques
- évoluer vers un environnement interactif complet

Les améliorations clés ajoutées à ce cahier des charges : **grammaire formelle EBNF, lexer dédié, gestion d'erreurs localisées, sécurité XSS, mécanisme d'échappement, balises auto-fermantes, commentaires, API de plugins, stratégie de tests, outillage (CLI/playground) et roadmap révisée**.
