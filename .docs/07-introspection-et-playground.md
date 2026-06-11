# 07 — API d'introspection + Playground web

## A. API d'introspection (cœur)

Le registre d'objets devient déclaratif via `registerObject(meta)` avec
métadonnées : description courte, schéma d'attributs (nom, type, requis/
optionnel, défaut, description, valeurs d'enum), exemple d'usage. **Toutes** les
collections sont renseignées (25 objets).

- `registry.list()` → entrées `{ path, aliases, kind, description }` (alias plats
  ET forme collection, ex. `mti` et `mt.inline`).
- `registry.describe(pathOuAlias)` → `ObjectMeta` (résout alias/collection).
- `registry.components(ast)` / `registry.variables(ast)` → composants `{!define}`
  (avec paramètres + défauts) et variables `{!set}` du document parsé.

Rétrocompatibilité : `resolvePath`/`isKnownObject`/`contentModelOf` inchangés
(réimplémentés sur les nouvelles structures). Tests : `tests/introspect.test.ts`
(11). Total moteur : **157 tests**.

## B. Playground (`playground/`, Vite + TS, workspace)

Le moteur est importé via alias Vite vers `../src` (rechargement à chaud) ; le
playground est un membre du workspace npm.

### Structure
- `htsl-lang.ts` : StreamLanguage CodeMirror 6 écrite à la main (modes content/
  header/math, comme le lexer), tags → classes CSS.
- `complete.ts` : source d'autocomplétion contextuelle. **Parse le document à la
  volée** (pas l'AST mis en cache) pour refléter les composants/variables tout
  juste tapés.
- `examples.ts` : exemples préchargés (galerie de formules + composant card,
  scène 3D + repère, plan complexe, document mixte équations + références).
- `main.ts` : éditeur, pipeline de rendu, panneaux redimensionnables, boutons.

### Comportements
- Trois panneaux redimensionnables (éditeur · rendu · AST masquable).
- Rendu à la frappe (debounce 150 ms), parser **tolerant** ; erreurs en bandeau
  + soulignées (`@codemirror/lint`, conversion ligne/colonne → offset). Le rendu
  conserve la dernière sortie valide → la page ne casse jamais.
- KaTeX + Plotly injectés (peerDependency). Scènes hydratées via `hydrateScenes`.
- Boutons : copier le HTML, télécharger le `.htsl`, partage par hash d'URL
  (encodage base64 UTF-8, rechargé à l'ouverture).
- `npm run playground:build` → `playground/dist/` (statique déployable).

### Vérifié en navigateur
Coloration syntaxique, rendu KaTeX dans des composants, scène 3D Plotly, AST,
bandeau + soulignement d'erreur (page vivante), autocomplétion : objets après
`{@` (16 `mg2.*`), attributs après `[` (center/radius/color/opacity avec
défauts), variables après `{$` (mises à jour en direct).

## Correctif

Le parser n'avait pas de régression ; le seul ajustement playground a été de
faire parser le document à la volée dans la source d'autocomplétion (l'AST
debouncé accusait un retard).
