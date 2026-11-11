---
name: htsl-authoring
description: >-
  Produit tout type de contenu en HTSL (HyperText Structured Language) et le livre
  (source HTSL à coller dans le playground, ou page HTML autonome prête à ouvrir).
  HTSL sert à TOUT : livres et romans, cours / manuels / rapports / articles,
  présentations en diapositives, pages web interactives, fiches d'exercices. À
  utiliser dès qu'on demande de rédiger, mettre en forme, générer ou convertir une
  ressource — avec ou sans formules (KaTeX), géométrie 2D/3D (Plotly/Three.js),
  graphes, tableaux de variations/signes, encadrés (théorème, définition…), quiz,
  flashcards, frises, slides, document paginé/PDF. Déclencheurs : HTSL, .htsl,
  livre, roman, cours, manuel, rapport, polycopié, diaporama, slides, présentation,
  fiche, exercice, quiz, théorème, formule, géométrie.
---

# Rédiger en HTSL

HTSL compile un balisage léger `{tag:contenu}` en HTML riche. **Il couvre tous les
usages** : livres et romans, cours et manuels, rapports et articles, présentations
en diapositives, pages web interactives. Ce skill t'apprend à l'écrire sans erreur,
à **vérifier avec le moteur**, et à livrer.

## 0. Syntaxe en 30 secondes

```
{tag:contenu}  ·  {tag.classe:…}  ·  {tag#id:…}  ·  {tag[a=1, b="val 2"]:…}
{img[src="a.png"]/}        → élément auto-fermant
{@objet[attrs]:…}  {@objet/}   → objet riche (maths, encadré, scène, slide…)
{!-- commentaire --}       → aucune sortie
$formule$  $$formule$$      → maths inline / bloc
\{ \} \: \$                → caractères littéraux
```

Deux familles : **éléments HTML** (`h1 p ul li table strong em code a img figure…`,
écrits SANS `@`) et **objets `@`** (tout le reste). Catalogue exhaustif :
`reference/objects.md` — la source de vérité, **n'invente jamais un objet**.

## 1. Choisir le format AVANT d'écrire

Refaire un contenu long dans un autre format coûte cher. Décide d'abord :

| Intention (mots de l'utilisateur) | Format | Fiche |
|---|---|---|
| roman, nouvelle, livre, « à garder / imprimer », polycopié, rapport, manuel, cours long | **`{@document}`** paginé | `reference/book.md` (récit) · `reference/long-document.md` (pédagogie/pro) |
| exposé, soutenance, conférence, « slides », diaporama, présentation projetée | **`{@slider}`** | `reference/slides.md` |
| s'entraîner, réviser, page en ligne, démo interactive | **page interactive** (`{@quiz}`, `{@reveal}`, `{@tabs}`, `{@param}`…) | `reference/interactive.md` |
| élément répété (badge, encadré maison, en-tête de partie) | **composant** `{!define}` | `reference/components.md` |
| autre / doute | le composant le plus adapté — **en cas de doute, demande avant de commencer** | — |

Charge **uniquement** la fiche du format choisi (elles disent quels objets utiliser,
lesquels éviter, et les vérifs propres). Pour les maths/géométrie/composants en
détail : `reference/syntax.md`.

## 2. Règle absolue : vérifier avec le moteur avant de livrer

**Aucun fichier n'est livré sans ces trois étapes.** Les deux premières sont
scriptées (`skills/htsl-authoring/scripts/`) :

1. **lint** — compilation stricte, **0 erreur** :
   ```bash
   node skills/htsl-authoring/scripts/lint.mjs mon-fichier.htsl
   ```
2. **verify** — rendu + contrôles : formules invalides (KaTeX), **objets inexistants**
   (`{@table}` au lieu de `{table}`…), balisage HTSL resté visible dans le rendu,
   accolades déséquilibrées, **scène dynamique dans un `{@slider}`** :
   ```bash
   node skills/htsl-authoring/scripts/verify.mjs mon-fichier.htsl
   ```
   (Accepte un `.htsl` ou le `<script type="text/htsl">` d'un `.html`.)
3. **vérif visuelle** — rendre dans un vrai navigateur, repérer les **débordements**
   (page, diapositive, largeur), et **regarder** quelques pages/slides en capture
   avant de livrer. Les scripts ne voient pas la mise en page ; cette étape si.

Si tu n'as pas de navigateur fiable sous la main, dis-le et livre le **source HTSL**
(l'utilisateur le voit dans le playground) plutôt que d'affirmer qu'une page autonome
« marche » sans l'avoir vue.

## 3. Pièges du moteur (vérifiés — valables partout)

> Les pièges #1, #2 et #4 ont été **corrigés dans le moteur** (bugs A1–A3). La build
> **CDN publiée** peut rester en retard : si tu génères une page autonome via le CDN,
> garde les habitudes sûres indiquées tant qu'une nouvelle version n'est pas publiée.


1. **Apostrophes & guillemets d'attribut** (corrigé, bug A2). Les valeurs d'attribut
   acceptent guillemets **doubles ou simples** ; une apostrophe passe dans le texte et
   dans un `{@codeblock}`. Seul reste : une apostrophe **à l'intérieur d'une valeur
   single-quote** la ferme (`title='l'eau'` → erreur) → mets des guillemets doubles
   pour une valeur contenant `'` : `title="l'eau"`. En français soigné, apostrophe
   typographique `’` dans le texte.
2. **Espace entre deux éléments inline — désormais préservé.** Le moteur conserve
   l'espace source : `{em:a} {strong:b}` → `a b` (idem `$x$ {em:…}`). ⚠ La build
   **CDN publiée** peut être en retard sur cette correction : si tu cibles une page
   autonome via le CDN, garde l'habitude sûre de mettre un vrai mot entre deux inline
   (`{em:a} et {strong:b}`) ou l'espace DANS un élément (`{em:a } {strong:b}`).
3. **N'utilise que des objets qui existent.** `{@table}` n'existe pas → sortie cassée
   silencieuse ; le tableau HTML s'écrit `{table:…}` (sans `@`). En cas de doute,
   `verify.mjs` le signale (il liste tout `{@…}` absent du registre).
4. **Accolade dans une formule** (corrigé, bug A3) : un `}` dans `$…$`/`$$…$$` est
   désormais du LaTeX littéral (`$x}$` passe). Équilibre quand même tes `{`/`}` de
   balisage et tes `$…$` : un vrai déséquilibre de balises reste une erreur.
5. **Numérotation globale.** Les encadrés (`{@theorem}`…) et exercices sont numérotés
   sur tout le fichier : renvoie à un élément par son **label** (`{@ref[to=…]/}`),
   jamais « voir le théorème 3 ».
6. **`{@mtr}` ≠ `{@ref}`** : `{@mtr[to=…]}` renvoie à une **équation** `{@mte}` ;
   `{@ref[to=…]}` renvoie à un **encadré** (théorème, définition…). Les confondre
   lève « référence inconnue ».
7. **Contenu trop large** (formule, tableau, image) → le couper/réduire ; sur une
   page web, le rendre défilable (vérif largeur mobile).

## 4. Méthode pour les contenus longs

- **Écris par morceaux** (chapitre, section, groupe de slides), **teste chaque
  morceau dès qu'il est écrit** (lint+verify), puis assemble.
- Si l'utilisateur fournit un **plan / programme / synopsis**, fais-en une liste de
  contrôle et relis-la point par point à la fin.
- **Envoie un point d'avancement** après chaque grande partie.
- **Tout résultat chiffré est vérifié par du code** (Python/sympy/numpy) avant d'être
  écrit ; tout code inclus est exécuté. Pas de texte qui se corrige lui-même
  (« …non, en fait… ») : refais et réécris.
- Factorise le balisage répété en **composants `{!define}`** plutôt que de recopier.

## 5. Livrer

- Par défaut : **source HTSL** dans un bloc ```htsl ``` (collable dans le playground
  https://oscarmedra.github.io/htsl_engine/). Jamais de HTML autour en ce mode.
- « Une page à ouvrir / envoyer / un fichier » : **page HTML autonome** depuis
  `templates/standalone.html` (CDN + runtime + `mathCss` ; compile après `window.load`
  avec `{ katex }`). Charge Plotly pour `{@mg2/mg3/plot/chart}` ; Three.js est chargé
  seul pour `{@s3}`.
- **Page autonome contenant un `{@slider}`** : utilise `templates/standalone-slides.html`
  (bundle **non-auto** + `htsl_engine.hydrate()` appelé **une seule fois**). Le bundle
  auto (MutationObserver) peut boucler avec un slider → page figée. Détails : `slides.md`.
- **Message de livraison en 2 lignes** : ce qui a été produit et vérifié (0 erreur,
  nombre de pages/slides regardés), **sans** résumer tout le contenu.

## Fichiers de ce skill

| Chemin | Contenu |
|---|---|
| `reference/objects.md` | **Catalogue exhaustif** (125 entrées) généré depuis le registre : chemin, alias, attributs, exemple. |
| `reference/syntax.md` | Maths, géométrie (décor/acteurs, s3+timeline), composants/variables, HTML→HTSL, pièges. |
| `reference/book.md` · `long-document.md` · `slides.md` · `interactive.md` · `components.md` | **Une fiche par type de production** : objets à utiliser / à éviter, vérifs propres. Charge celle du format choisi. |
| `reference/recipes.md` | Mini-recettes variées (snippets). |
| `examples/*.htsl` | **Un fichier complet par type**, qui passe lint + verify. Imite un exemple qui marche. |
| `scripts/lint.mjs` · `verify.mjs` | Vérification exécutable (voir §2). |
| `templates/standalone.html` · `standalone-slides.html` | Gabarits de page autonome (le second : slider en hydratation explicite, anti-boucle). |
