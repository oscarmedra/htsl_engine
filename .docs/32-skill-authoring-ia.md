# Skill IA d'authoring HTSL (`skills/htsl-authoring/`)

## Idée

Donner aux modèles IA (Claude Code et au-delà) un **skill** qui leur apprend à
exploiter HTSL à fond pour rédiger des ressources pédagogiques : cours, fiches
d'exercices, diaporamas, documents paginés/PDF, quiz, démos interactives. Ce n'est
pas une fonctionnalité du moteur mais une **couche de documentation orientée
génération** : versionnée dans le dépôt, livrée avec le projet, copiable ailleurs.

Objectif central : un modèle qui lit ce skill sait **quels objets existent**,
**comment les combiner par intention pédagogique**, et **comment livrer** le
résultat (source HTSL ou page HTML autonome) — sans inventer d'objet ni d'attribut.

## Contenu

```
skills/htsl-authoring/
├─ SKILL.md                    → frontmatter (name + description de déclenchement),
│                                syntaxe en 30 s, méthode en 5 étapes, objets par
│                                intention, livraison, sécurité.
├─ reference/
│  ├─ objects.md               → catalogue EXHAUSTIF des 125 entrées (source de vérité).
│  ├─ syntax.md                → maths, géométrie (décor/acteurs, s3 + timeline),
│  │                             composants/variables, HTML→HTSL, 7 pièges.
│  └─ recipes.md               → 9 recettes complètes prêtes à adapter.
└─ templates/
   └─ standalone.html          → page autonome (CDN + runtime + mathCss).
```

## Décisions

- **Catalogue généré, pas écrit à la main.** `reference/objects.md` est produit par
  un script qui parcourt `registry.list()` + `registry.describe()` du moteur (chemin,
  alias, attributs typés, défauts, requis, exemple). Conséquence : la doc reste
  **alignée sur le code** et aucune invention n'est possible. À régénérer quand le
  registre change (script jetable, cf. historique de la session).
- **Deux livrables assumés** (choix produit) : source HTSL propre (à coller dans le
  playground) *et* page HTML autonome (à double-cliquer / envoyer). Le skill explique
  quand utiliser lequel.
- **Progressive disclosure** : `SKILL.md` reste court (~160 lignes) et renvoie aux
  fichiers `reference/` pour l'exhaustif — le modèle ne charge le détail qu'au besoin.

## Le point qui fait qu'une page autonome « marche vraiment »

Le `templates/standalone.html` encode trois règles non négociables (sinon rendu
incomplet, silencieusement) :

1. **Compiler après `window.load`** et passer `{ katex: window.katex }` à `compile`
   (KaTeX est chargé en `defer`) — sinon formules en LaTeX brut.
2. **Injecter `htsl_engine.mathCss`** dans un `<style>` — le runtime ne le fait pas ;
   sans lui, encadrés, slides, numéros d'équation et tableaux ne sont pas stylés.
3. Charger **Plotly** pour `{@mg2/mg3/plot/chart}` ; **Three.js est chargé seul** par
   le runtime pour `{@s3}` ; **mhchem** si `{@ce}`. Le bundle `htsl.auto.global.js`
   (MutationObserver) hydrate ensuite scènes/slides/quiz/onglets automatiquement.

## Vérification

- **Catalogue** : 125 entrées (structure 37, formules 22, géométrie 37, document 29).
- **Exemples testés** : les 18 blocs ```htsl``` du skill (SKILL.md, syntax.md,
  recipes.md + le `text/htsl` du template) compilent sans erreur via `compile()`.
  2 bugs d'exemple corrigés au passage, le moteur les ayant rejetés : un
  `{@mtr[to=…]}` (réf. d'équation) utilisé pour un label de **callout** → `{@ref}` ;
  un `{$children}` écrit dans le **texte d'usage** d'un composant (hors corps).
- **Livrable prouvé** : `standalone.html` rendu dans un navigateur — KaTeX
  typographié + encadrés « Théorème 1 » / « Exemple 1 » numérotés et stylés.

## Usage

- Dans Claude Code sur ce dépôt : le skill se déclenche sur les demandes de
  ressources pédagogiques (cours, exos, slides, quiz, formules, géométrie…).
- Ailleurs / autre modèle : copier le dossier, ou coller `reference/objects.md` +
  `reference/syntax.md` en contexte.

## v2 — architecture par type + vérification scriptée

Après retour d'usage (recommandations tirées d'une section de génération HTSL
éprouvée), le skill est restructuré :

- **Table d'intentions** en tête de `SKILL.md` : choisir le format AVANT d'écrire
  (livre/roman → `{@document}` ; exposé → `{@slider}` ; entraînement → page
  interactive ; en cas de doute, demander).
- **Une fiche par type** chargée à la demande : `reference/book.md` (romans),
  `long-document.md` (cours/manuels/rapports), `slides.md`, `interactive.md`,
  `components.md` — chacune dit les objets à utiliser, à éviter, et les vérifs propres.
- **Vérification obligatoire scriptée** (`scripts/`) : `lint.mjs` (compile strict,
  0 erreur) et `verify.mjs` (formules via KaTeX en Node, objets inexistants via
  `isKnownObject`, balisage resté visible dans le rendu, accolades, et **scène
  dynamique dans un `{@slider}`**). Résolveur de moteur portable (`_engine.mjs` :
  `$HTSL_CORE` → paquet npm → `packages/core/dist`). Troisième étape = vérif visuelle
  navigateur (débordements, captures), non scriptable.
- **`examples/`** : un fichier complet par type (`book/course/slides/interactive/
  components.htsl`) qui passe lint + verify — Claude imite un exemple qui marche.
- **Pièges vérifiés contre le moteur** (et non recopiés) : apostrophe droite dans un
  attribut → erreur (OK dans le texte) ; espace seul entre inline supprimé (fix
  `​ ` ou un mot) ; `{@table}` inexistant (élément = `{table}`) ; `{@mtr}`
  (équation) ≠ `{@ref}` (encadré) ; numérotation globale → renvoyer par label.

### Découverte de test (opérateur de Koopman)

En générant un diaporama de test, une **scène Plotly (`{@plot}`) placée dans un
`{@slider}`** fait **boucler** le runtime auto (MutationObserver ↔ slider ↔ Plotly) en
page autonome → page figée. `{@plot}` seul, ou un slider seul, fonctionnent. Documenté
dans `slides.md` et détecté par `verify.mjs` ; règle : pas de scène dynamique dans un
slider (illustrer autrement, sortir la scène, ou utiliser le playground).

## Note d'entretien

L'index `.docs/README.md` n'est à jour que jusqu'au doc `12` (les docs 13→31 n'y
figurent pas) ; `history.md` reste, lui, la trace active. Ce doc suit la même
pratique (fichier + note d'historique), sans réintroduire de ligne isolée dans
l'index obsolète.
