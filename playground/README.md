# HTSL — Playground

Application web (Vite) pour écrire du HTSL, le voir rendu en direct, et l'éditer
**aussi bien depuis le code que depuis le rendu**. Elle consomme le moteur
(`htsl`) et les extensions d'éditeur (`@htsl/codemirror`) du monorepo.

## Démarrage

Depuis la racine du dépôt :

```bash
npm install
npm run dev        # serveur de dev → http://localhost:5173
```

Ou depuis ce dossier : `npm run dev`, `npm run build` (→ `dist/`),
`npm run preview`. Le moteur et `@htsl/codemirror` sont liés par les workspaces
(rechargement à chaud quand on modifie le cœur).

## Déploiement public (GitHub Pages, sans serveur)

Le playground est un **site statique** : `vite build` produit du HTML/JS/CSS, et
les libs lourdes (KaTeX/Plotly/Three) sont chargées à l'exécution par le runtime
HTSL. La config Vite utilise `base: "./"` (chemins **relatifs**) → le build
fonctionne à n'importe quelle URL, y compris un sous-chemin de projet
`https://<user>.github.io/<repo>/`. Aucune modification de code n'est requise.

Le workflow [`.github/workflows/deploy-playground.yml`](../.github/workflows/deploy-playground.yml)
construit le playground et le publie sur Pages à chaque push sur `main`.

Pré-requis (une seule fois, le dépôt n'ayant pas encore de remote) :

```bash
# 1. Créer le dépôt distant et pousser (via gh, ou à la main sur github.com)
gh repo create htsl_motor --public --source=. --remote=origin --push
# 2. Activer Pages avec la source « GitHub Actions »
gh api -X POST repos/<user>/htsl_motor/pages -f build_type=workflow
```

Sans `gh` : créer le dépôt sur github.com, `git remote add origin <url>`,
`git push -u origin main`, puis **Settings → Pages → Source : GitHub Actions**.
Le workflow se déclenche au push (ou via **Actions → Run workflow**) et l'URL
publique apparaît dans l'environnement `github-pages`.

> Les liens de partage `#z=` utilisent `location.origin + location.pathname`,
> donc ils restent valides quel que soit l'hébergement (sous-chemin compris).

## Disposition

Trois panneaux : **Éditeur HTSL** · **Rendu** (iframe isolée) · **AST** (JSON).

- Cases en barre supérieure : **« Éditeur »** (à gauche) et **« AST »** (à droite)
  masquent leur panneau. L'AST est **masqué par défaut** ; masquer l'éditeur
  laisse le rendu prendre toute la largeur — pratique pour **travailler
  uniquement depuis le rendu** ou pour projeter en cours.
- Poignées de redimensionnement entre les panneaux.

## Édition dans l'éditeur (CodeMirror)

- **Rendu à la frappe** (debounce ~150 ms) ; **parser tolérant** : les erreurs
  s'affichent en bandeau **et** sont soulignées (ligne/colonne). La page ne casse
  jamais — le dernier rendu valide est conservé.
- **Coloration**, **autocomplétion**, **indentation** et **linter** viennent de
  `@htsl/codemirror` (voir son README). Tab/Maj-Tab indentent.

## Couche d'authoring (réduire la marche d'apprentissage)

Tout est **généré depuis l'introspection du moteur** (`registry.list/describe/
components`) — aucune liste d'éléments codée en dur.

- **Palette d'insertion** — bouton **➕ Insérer**. Un tiroir classé en groupes
  clairs : **Objets créés** (vos composants `{!define}`), **Textes**,
  **Formules**, **Scènes**, **Géométrie**. Recherche insensible aux accents,
  description lisible en avant + aperçu **texte**. Un clic insère un **snippet à
  trous** (navigation au Tab) au curseur ; conteneurs et scènes arrivent
  **pré-remplis** d'un contenu tampon qui s'affiche immédiatement.
- **Commande slash** — taper `/` en début de ligne ouvre le même menu.
- **Aide contextuelle** — panneau sous l'éditeur : pour l'objet sous le curseur,
  description + tableau d'attributs (type, requis/défaut), via `describe()`.

## Édition directe depuis le rendu

Le rendu n'est pas qu'un aperçu : on y édite, et les modifications sont réécrites
dans le source.

- **Texte** — cliquer un texte le rend éditable sur place (sans syntaxe) ; à la
  perte de focus, il est réécrit dans le source (caractères spéciaux ré-échappés).
- **Bloc / élément** — survol = halo bleu ; **double-clic** ouvre un **véritable
  éditeur HTSL** (CodeMirror : coloration, autocomplétion, indentation) en
  superposition **translucide** sur l'élément, pré-rempli avec sa source HTSL.
  `⌘/Ctrl + Entrée` valide, `Échap` annule. Double-cliquer une instance de
  composant édite son **appel** `{@…}` (pas le modèle). La translucidité laisse
  l'audience garder le visuel du rendu pendant l'édition.

> Objectif assumé : pouvoir tout faire depuis le rendu — l'éditeur de gauche
> devient optionnel (case « Éditeur »).

## Performance du rendu

Le rendu est mis à jour **chirurgicalement** : `data-htsl-hash` sur chaque bloc +
[morphdom](https://github.com/patrick-steele-idem/morphdom) ne touchent que les
nœuds réellement changés ; KaTeX est mis en cache et les scènes Plotly ne sont
re-tracées que si leur description change. Un indicateur affiche le temps de MAJ
et le nombre de nœuds touchés (mode dev).

## Frameworks CSS (Tailwind, Bootstrap, …)

Le rendu se fait dans une **iframe isolée** : chargez n'importe quel framework
**directement depuis votre document HTSL**, il s'applique au rendu sans toucher à
l'interface du playground.

```htsl
{!-- Bootstrap --}
{link[rel="stylesheet", href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"]/}

{!-- ou Tailwind (Play CDN) --}
{script[src="https://cdn.tailwindcss.com"]/}
```

Le raccourci `.classe` n'accepte que des identifiants simples ; les variantes à
`:` `/` `[]` (`hover:`, `md:`, `w-1/2`, `p-[10px]`) passent par `[class="…"]` :

```htsl
{div[class="bg-white ring-1 ring-slate-200 rounded-xl p-4 hover:shadow-md"]:
  {h2[class="text-lg font-semibold text-indigo-600"]:Titre}
}
```

KaTeX (formules) est toujours disponible dans l'iframe ; Plotly (scènes) y est
chargé automatiquement quand une scène est présente.

## Dynamisme = données + runtime (zéro `<script>` émis)

Le rendu ne produit **jamais** de JS exécutable. Les scènes sont des **nœuds de
données** (`data-htsl-scene`) ; après chaque morphing, le playground appelle le
**runtime unique** du moteur (`hydrate`/`purge`, voir le README de `htsl`) sur
l'iframe : il charge Plotly **une seule fois** (Promise cachée), dessine, met à
jour via `Plotly.react` au changement, et **purge** les scènes retirées. C'est
idempotent → aucune des erreurs classiques (« Plotly is not defined », double
déclaration, `getElementById` null).

- `{script[src=…]/}` (CDN **externe** écrit par l'auteur) reste chargé dans
  `<head>` (une fois, réconcilié par clé).
- `{script: …code…}` **inline** est rendu **inerte** (`type="text/plain"`) : le
  contenu HTSL ne produit pas de JS exécutable.

## Autres

- Bouton **📖 Documentation** → `documentation.html` : une page complète
  (philosophie, motivations des choix, outils intégrés, syntaxe, **catalogue
  d'objets généré depuis l'introspection**, et un **prompt prêt à coller** pour
  qu'une IA rédige du HTSL). Construite en multi-pages Vite.
- Boutons **Copier HTML** / **Télécharger** (`.htsl`) / **PDF** / **Partager**.
- **Sauvegarde & partage (sans serveur)** (`src/persistence.ts`) :
  - **Auto-save** — le document courant est écrit dans `localStorage` à chaque
    frappe (débattu), donc **un rafraîchissement ne perd jamais le travail**.
  - **Lien partageable** — **Partager** encode tout le document dans l'URL,
    **compressé en gzip** (`CompressionStream`, hash `#z=`) puis base64url, et le
    copie dans le presse-papier. Ouvrir le lien restaure le document (décompression
    au chargement), puis le hash est nettoyé. Un ancien format non compressé
    (`#s=`) reste décodé pour les liens existants. Aucun backend, aucun compte.
- **Export PDF** — le bouton **PDF** ouvre la boîte d'impression du navigateur sur
  **l'iframe seule** (→ « Enregistrer au format PDF ») : le PDF est le rendu pur,
  avec texte sélectionnable, formules KaTeX et styles intacts. Mise en page
  **A4** (`@page { size: A4; margin: 1.8cm 2cm }`) adaptée aux documents
  mathématiques, typographie d'impression confortable, et **anti-coupure** des
  formules / scènes / tableaux entre deux pages. Le nom de fichier par défaut
  reprend le premier titre du document. (Aucune dépendance ajoutée.)

## Organisation du code

| Fichier | Rôle |
|---------|------|
| `src/main.ts` | Composition : éditeur CodeMirror, pipeline de rendu, barre d'outils, panneaux. |
| `src/frame.ts` | `FrameRenderer` : iframe, morphing chirurgical, délègue au runtime du moteur (`purge` des scènes retirées + `hydrate`), édition de texte + détection du double-clic bloc. |
| `src/block-editor.ts` | Éditeur de bloc flottant (CodeMirror complet) positionné sur l'élément. |
| `src/palette.ts` | Palette d'insertion (générée depuis l'introspection). |
| `src/help.ts` | Aide contextuelle (`describe()` de l'objet au curseur). |
| `src/examples.ts` | Document d'exemple chargé au démarrage. |
| `documentation.html` · `src/documentation.ts` · `src/docs.css` | Page de documentation (catalogue + prompt IA générés depuis l'introspection). |

Le comportement de l'éditeur (langage, complétion, linter) n'est **pas**
réimplémenté ici : il vient du paquet réutilisable `@htsl/codemirror`.
