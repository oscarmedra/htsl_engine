# 14 — Distribution & déploiement (passer de « local » à « intégrable »)

## Question

L'outil ne vit que sur la machine de l'auteur. Comment les utilisateurs
intéressés vont-ils l'intégrer ?

## Constat : l'architecture est déjà faite pour l'intégration

Le cœur expose deux moitiés nettes :

- `compile(source, options)` → une **chaîne HTML** (nœuds `data-htsl-*`, **aucun
  JS exécutable** issu du contenu) ;
- `installHtslRuntime(win?)` → expose **un seul global `window.HTSL`**, hydrate
  au `DOMContentLoaded` + `MutationObserver`, et **charge KaTeX/Plotly/Three à la
  demande**.

C'est le modèle « le build produit du HTML, le client hydrate ». L'intégration
n'est donc pas à concevoir, elle est à **distribuer**.

## Les 4 modes d'intégration (par public)

| Public | Besoin | Livrable |
|---|---|---|
| Prof / blogueur (non-dev) | écrire du HTSL sans rien installer | **playground hébergé** + **balise `<script>` CDN** auto-hydratante |
| Dev web | l'intégrer dans son app | `npm install @noah-medra/htsl-core` (+ `@noah-medra/htsl-codemirror`) |
| Auteur de polycopiés / CI | `doc.htsl` → HTML | **CLI** `npx htsl build` |
| Écosystème | l'utiliser dans son framework | plugin Vite / remark / Astro |

## Roadmap retenue (effort croissant, levier décroissant)

1. **Déployer le playground** — *fait* (voir ci-dessous). Quasi zéro effort,
   transforme « local » en « produit partageable par lien ».
2. **Publier npm `@noah-medra/htsl-core` + `@noah-medra/htsl-codemirror`** + **bundle
   CDN** — *préparé* (voir « Étape 2 » ci-dessous). Le nom `htsl` (sans scope) est
   pris par un package abandonné de 2018, et l'org `@htsl` n'est pas créable
   (collision avec ce package) → les packages utilisent le **scope personnel de
   l'auteur** `@noah-medra` (= son pseudo npm), qui ne nécessite aucune org.
3. **CLI** `npx htsl build doc.htsl -o doc.html` (HTML autonome).
4. **Plugins de framework**.

## Étape 1 réalisée : playground sur GitHub Pages (site statique, sans serveur)

- **Pourquoi c'est trivial ici** : `playground/vite.config.ts` utilise
  `base: "./"` (chemins **relatifs**) → le build tourne à n'importe quelle URL,
  y compris un sous-chemin projet `https://<user>.github.io/<repo>/`, **sans
  modifier le code**. Le build importe le moteur et l'éditeur **depuis les
  sources** (alias Vite) → pas besoin de publier npm d'abord.
- **Workflow** : `.github/workflows/deploy-playground.yml` — `npm ci` →
  `npm run build -w htsl-playground` → `upload-pages-artifact` (`playground/dist`)
  → `deploy-pages`. Déclenché sur push `main` + `workflow_dispatch`. Permissions
  OIDC minimales (`pages: write`, `id-token: write`), `concurrency` sur `pages`.
- **Déployé** : dépôt public `oscarmedra/htsl_engine`, Pages activé
  (`build_type=workflow`). **URL publique : https://oscarmedra.github.io/htsl_engine/**
  La procédure (création remote + activation Pages) reste documentée dans
  `playground/README.md` pour reproduire ailleurs.
- **Liens de partage** : `#z=` s'appuie sur `location.origin + location.pathname`,
  donc valides quel que soit l'hébergement (sous-chemin compris). Le travail de
  persistance (`.docs/13`) devient le **canal de distribution** du playground.

## Vérifié

`npm run build -w htsl-playground` réussit (index + documentation, base relative,
bundle ~225 kB gzip ; libs lourdes hors bundle car chargées au runtime). `dist`
est gitignoré ; le build se fait en CI. **En production** : le workflow a tourné
(build + deploy verts), et `https://oscarmedra.github.io/htsl_engine/` répond
`200` (page d'accueil, asset JS sur le sous-chemin → base relative OK, et
`documentation.html`).

## Étape 2 préparée : publication npm `@noah-medra/htsl-core` + `@noah-medra/htsl-codemirror` + CDN

- **Renommage** : `htsl` → **`@noah-medra/htsl-core`** et `@htsl/codemirror` →
  **`@noah-medra/htsl-codemirror`** (scope personnel `@noah-medra`, sans org). Tous
  les imports source/tests, les alias Vite, les `paths` tsconfig et les
  `peer/devDependencies` pointent sur `@noah-medra/htsl-core` (la peerDep de
  codemirror est `@noah-medra/htsl-core: "^0.1.0"` — satisfaite par le workspace
  local **et** valide une fois publiée).
- **Métadonnées de publication** sur les deux packages : `repository` (avec
  `directory`), `homepage`, `bugs`, `author`, `publishConfig.access: "public"`
  (requis pour un scope public), `prepublishOnly` (build avant publish), et `files`
  inclut `LICENSE` (+ `dist-min` pour le cœur). Fichier `LICENSE` (MIT) ajouté à la
  racine et copié dans chaque package.
- **Bundle CDN auto-hydratant** : nouvelle entrée `src/cdn.ts` →
  `dist-min/htsl.auto.global.js` (IIFE minifié) qui expose le global `htsl_engine`
  **et** appelle `installHtslRuntime()` au chargement (→ `window.HTSL`, hydratation
  des `data-htsl-*`, chargement KaTeX/Plotly/Three à la demande). Un prof colle
  une seule balise `<script>` et écrit/compile du HTSL sans build. Les variantes
  `htsl.global.js` (sans auto-runtime) et `htsl.min.js` (ESM) restent produites.
- **Workflow de publication** : `.github/workflows/release.yml` — sur Release
  GitHub (ou dispatch), `npm publish` des deux packages. Pré-requis utilisateur :
  un token Automation npm en secret de dépôt `NPM_TOKEN`.

### Vérifié

`npm run typecheck` + tests (core 220, codemirror 37) verts après renommage ;
`npm run build:all -w @noah-medra/htsl-core` produit dist + dist-min (3 bundles) ; playground
re-vérifié en navigateur (éditeur monté, rendu présent, 0 erreur console) ;
smoke-tests Node : `htsl.min.js` `compile()` OK et `htsl.auto.global.js` installe
bien `window.HTSL` sans crash ; `npm pack --dry-run` montre des tarballs corrects
(`@noah-medra/htsl-core` 211 kB avec dist+dist-min+LICENSE ; `@noah-medra/htsl-codemirror` 17 kB).

## Publié (2026-06-16)

`@noah-medra/htsl-core@0.1.0` et `@noah-medra/htsl-codemirror@0.1.0` sont **en
ligne sur npm** (installables, CDN unpkg `200` sur
`@noah-medra/htsl-core/dist-min/htsl.auto.global.js`). La publication a buté sur
la 2FA du compte (les tokens « Publish »/granular n'ont pas contourné la 2FA, et
`--otp` est ignoré en auth par token *Publish*) ; finalement débloquée en
fournissant un **code de récupération 2FA** comme valeur `--otp` (un par publish).
Le compte `noah-medra` a la 2FA « auth + writes » ; pour publier sans code à
l'avenir, créer un token **Automation** (Classic) ou **Granular** et le mettre en
secret `NPM_TOKEN` (workflow `release.yml`).

## Reste à faire (étapes 3-4)

CLI `npx htsl build` (HTML autonome) et plugins de framework. Le versioning reste
manuel (bump des `version` dans les package.json) ; changesets pourra être ajouté
plus tard si le rythme de releases le justifie.

## Manuel d'intégration dans la page Documentation du playground

La page `documentation.html` gagne une section **« Intégration (CDN / npm) »**
(nouveau groupe de nav « Exploiter le moteur ») expliquant les 3 façons
d'exploiter le moteur hors du playground : (1) balise `<script>` CDN
auto-hydratante (unpkg/jsDelivr), (2) `npm install @noah-medra/htsl-core`
(`compile()` + `installHtslRuntime()`), (3) compilation côté serveur/build →
HTML statique, plus un bonus « éditeur HTSL via `@noah-medra/htsl-codemirror` ».
Liens npm/GitHub inclus. Vérifié en navigateur (4 sous-sections, blocs de code
avec « Copier », 0 erreur). Déployé sur Pages au push (auto).
