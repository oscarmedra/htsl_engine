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
| Dev web | l'intégrer dans son app | `npm install htsl` (+ `@htsl/codemirror`) |
| Auteur de polycopiés / CI | `doc.htsl` → HTML | **CLI** `npx htsl build` |
| Écosystème | l'utiliser dans son framework | plugin Vite / remark / Astro |

## Roadmap retenue (effort croissant, levier décroissant)

1. **Déployer le playground** — *fait* (voir ci-dessous). Quasi zéro effort,
   transforme « local » en « produit partageable par lien ».
2. **Publier npm `htsl` + `@htsl/codemirror`** (scope conservé) + **bundle CDN**
   IIFE qui appelle `installHtslRuntime`. Pré-requis : versioning (changesets),
   fichier `LICENSE`, champ `repository`, déréférencer les deps workspace `*`.
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

## Reste à faire (étapes 2-4)

`LICENSE` (le champ `license: MIT` existe mais pas le fichier), champ
`repository`/`homepage` dans les `package.json`, cible de build CDN/IIFE,
changesets, puis CLI et plugins.
