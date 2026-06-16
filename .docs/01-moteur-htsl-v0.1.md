# 01 — Moteur HTSL v0.1

## Objectif

Première version fonctionnelle du moteur **HTSL (HyperText Structured Language)** :
un langage de balisage léger qui se compile en HTML via un AST.

## Stack

- TypeScript en mode `strict` (+ options strictes additionnelles dans `tsconfig.json`).
- Zéro dépendance dans le cœur (lexer, parser, renderer écrits à la main).
- Parser **descendant récursif**.
- Build ESM (navigateur + Node.js) via **tsup**.
- Tests avec **Vitest**.

## Architecture

```
src/
├── types.ts      # types des tokens et de l'AST (union discriminée Node)
├── errors.ts     # HTSLError : message localisé + extrait avec curseur ^
├── lexer.ts      # tokenisation, mode-aware (content / header)
├── parser.ts     # tokens → AST, récursif descendant
├── renderer.ts   # AST → HTML, échappement XSS obligatoire
└── index.ts      # API publique : parse(), render(), compile()
```

### Lexer (`lexer.ts`)

Lexer **à modes** : démarre en mode `content` (texte brut + frontières
`{` / `}` / commentaires) et bascule en mode `header` entre `{` et le `:` ou
`/}` qui termine l'en-tête, où il émet les jetons structurels (`IDENT`, `.`,
`#`, `[`, `]`, `=`, `,`, chaînes). Suit les positions ligne/colonne (1-based).
Gère les échappements `\{ \} \:` dans le texte et `\" \\` dans les chaînes.

### Parser (`parser.ts`)

Descente récursive suivant la grammaire formelle. Deux modes :
- `strict` : lève `HTSLError` à la première erreur.
- `tolerant` : insère un nœud `{ type: "error" }` et reprend après le prochain `}`.

Détecte : accolade jamais fermée, accolade fermante orpheline, attribut malformé,
identifiant invalide, profondeur max dépassée (défaut 256). Les nœuds texte
composés uniquement d'espaces (mise en forme) sont supprimés.

### Renderer (`renderer.ts`)

- **Échappement par défaut** de tout texte et de toute valeur d'attribut
  (`< > & "` → entités). Non négociable (anti-XSS).
- Balises **void** rendues sans fermeture.
- Option `prettyPrint` (indentation 2 espaces) sinon sortie compacte.
- Option `allowedTags` : toute balise hors liste devient du texte échappé inerte.
- Les commentaires ne produisent aucune sortie.

## API publique

```ts
import { parse, render, compile } from "@htsl/core";
const ast  = parse("{p:Bonjour}", { mode: "strict" });
const html = render(ast, { prettyPrint: true });
const out  = compile("{p:Bonjour}");
```

## Tests

55 tests Vitest répartis sur lexer / parser / renderer, incluant 6 **golden files**
(`tests/fixtures/*.htsl` → `*.html`). Couverture : types de tokens, positions,
échappements, tous les cas de syntaxe et d'erreur, échappement XSS, balises void,
pretty-print, robustesse (aucune exception non gérée hors `HTSLError`).

## Vérification

- `npm run typecheck` → OK
- `npm run build` → OK (dist ESM + types)
- `npm test` → 55/55 verts
- `npm run demo` → compile `demo.htsl` et affiche le HTML

## Hors périmètre v0.1

Objets spécialisés, API de plugins, LaTeX/KaTeX, CLI complète, playground web,
export PDF/JSON.
