# 08 — Monorepo + paquet @noah-medra/htsl-codemirror

## Restructuration en monorepo (npm workspaces)

Le projet passe d'un paquet unique à un monorepo :

| Avant | Après |
|-------|-------|
| `src/`, `tests/`, `package.json` (htsl) à la racine | `packages/core/` (paquet `htsl`) |
| _(éditeur dans le playground)_ | `packages/codemirror/` (`@noah-medra/htsl-codemirror`) |
| `playground/` | inchangé (privé) |

- **Déménagement** du moteur (`git mv` de `src/`, `tests/`, `scripts/`, configs,
  `demo*.htsl`, `examples/`, README) dans `packages/core/`. Aucune réécriture :
  les **157 tests passent à l'identique**.
- `package.json` racine : `private`, `workspaces: [packages/core, packages/codemirror, playground]`,
  scripts globaux `npm test` / `npm run build` / `npm run typecheck` (`--workspaces --if-present`)
  et `npm run dev` (playground).
- Le README racine décrit le monorepo ; le README moteur est dans `packages/core`.

## API d'introspection (packages/core)

Déjà en place (cf. `.docs/07`) et désormais dans le core : `registerObject`
avec métadonnées (description, schéma d'attributs typé, exemple) pour **toutes**
les collections ; `registry.list()` / `registry.describe()` ; introspection des
composants/variables d'un document parsé. 11 tests (`introspect.test.ts`).

## Paquet @noah-medra/htsl-codemirror

Extensions CodeMirror 6 **réutilisables**, extraites du playground :

- `htslLanguage()` — `StreamLanguage` écrit à la main (modes content/header/math),
  thème par défaut **inline** (auto-suffisant, aucune CSS requise côté hôte).
- `htslCompletion(registry)` — source d'autocomplétion branchée sur
  l'introspection (objets/composants après `{@`, attributs typés après `[`,
  variables après `{$`, directives après `{!`), re-parse à la volée.
- `htslLinter(parse)` — diagnostics soulignés depuis les `HTSLError` du mode
  tolérant ; helper pur `htslDiagnostics(text, parse)`.
- Peer deps : `@codemirror/*`, `@lezer/highlight`, `htsl`. README avec exemple
  d'intégration en < 10 lignes.
- Tests (21) : tokenisation (`htslTokens`), complétion (via `CompletionContext`),
  diagnostics. Bugs réels corrigés avec test : le tokenizer avalait les
  `.classes` (regex du tag incluait `.`).

## Playground

Consomme `@noah-medra/htsl-codemirror` (aliasé sur les sources en dev) et **ne réimplémente
plus rien** de l'éditeur : il compose `htslLanguage()`, `htslCompletion(registry)`,
`htslLinter(parse)` avec `basicSetup`. Rendu en iframe (frameworks CSS au choix),
KaTeX/Plotly injectés, exemples, boutons, build statique.

## Résultat

`npm test` vert sur tous les paquets (core 157 + codemirror 21). Aucune
fonctionnalité du langage modifiée. Le playground prouve l'intégrabilité réelle
de `@noah-medra/htsl-codemirror` (coloration, complétion et soulignement d'erreurs vérifiés
en navigateur).
