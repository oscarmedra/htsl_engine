# Historique des actions — htsl_motor

Journal continu de l'ensemble des actions réalisées sur le projet.
Les entrées les plus récentes sont ajoutées en bas.

---

## 2026-06-10

- Initialisation du dépôt git (`git init`) à la racine du projet.
- Renommage de la branche par défaut `master` → `main`.
- Premier commit (`Initial commit`, `2d66a5f`) incluant `.groupedtimelineinclude` et les specs (`.specs/brd.md`, `.specs/prd.md`, `.specs/requirements.md`).
- Création du dossier `.docs/` avec `README.md` et `00-initialisation.md`.
- Création du dossier `.history/` avec ce fichier `history.md`.
- Mise en place de la convention permanente : tenir à jour `.docs/` et `.history/` tout au long du développement.

### Développement du moteur HTSL v0.1

- Configuration du projet : `package.json` (scripts build/test/demo/typecheck), `tsconfig.json` (mode strict + options strictes), `tsup.config.ts` (ESM, plateforme neutre), `.gitignore`.
- `src/types.ts` : types des tokens et de l'AST (union discriminée `Node` : `ElementNode`, `TextNode`, `CommentNode`, `ErrorNode`) + types d'options.
- `src/errors.ts` : `HTSLError` avec message localisé (ligne/col) et extrait du source avec curseur `^`.
- `src/lexer.ts` : lexer à modes (content/header), suivi ligne/colonne, échappements, gestion stricte/tolérante.
- `src/parser.ts` : parser descendant récursif suivant la grammaire formelle ; modes strict (throw) et tolerant (nœud `error`) ; détection des erreurs du §5 ; suppression des nœuds texte blancs.
- `src/renderer.ts` : rendu AST→HTML avec échappement XSS par défaut, balises void, `prettyPrint`, `allowedTags`.
- `src/index.ts` : API publique `parse()`, `render()`, `compile()` + exports de types.
- Tests Vitest : `tests/lexer.test.ts`, `tests/parser.test.ts`, `tests/renderer.test.ts` (55 tests).
- 6 golden files dans `tests/fixtures/` (`.htsl` → `.html`), générés via `scripts/gen-fixtures.ts`.
- `demo.htsl` + `scripts/demo.ts` (script `npm run demo`).
- `README.md` complet (présentation, syntaxe, grammaire, API, sécurité, erreurs, tests).
- Ajout de `@types/node` en devDependency pour le typecheck des tests/scripts.
- Vérification finale : `npm run typecheck` OK, `npm run build` OK, `npm test` 55/55 verts, `npm run demo` OK.

### Build minifié (test sur projet externe)

- Ajout de `tsup.min.config.ts` et du script `npm run build:min` produisant dans `dist-min/` :
  - `htsl.min.js` — ESM minifié (~9.6 Ko) pour `import` dans un projet avec bundler.
  - `htsl.global.js` — IIFE minifié (~10 Ko) exposant un global `HTSL` pour usage via `<script>`.
- Vérification des deux bundles : ESM (`compile`/`parse` + échappement XSS) et IIFE (global `HTSL` exposant `parse/render/compile/tokenize/HTSLError`).
- Ajout de `examples/browser.html` : page de démonstration navigateur (édition en direct) chargeant le bundle global.
- `dist-min/` ajouté au `.gitignore` (artefact de build, régénérable via `npm run build:min`).

### Objet moteur nommé `htsl_engine`

- Ajout dans `src/index.ts` d'un objet moteur `htsl_engine` (`{ parse, render, compile, tokenize, HTSLError }`), exporté en nommé **et** en défaut, pour un usage `htsl_engine.compile(...)`.
- Bundle global renommé : `globalName: "htsl_engine"` + footer exposant `globalThis.htsl_engine` et l'alias majuscule `globalThis.HTSL_ENGINE` (même objet moteur, sans `default`).
- Vérifié : global navigateur `htsl_engine.compile` / `HTML_ENGINE.compile`, et ESM `import htsl_engine`, `import { htsl_engine }`, fonctions nommées.
- `examples/browser.html` et `README.md` mis à jour pour `htsl_engine`.



