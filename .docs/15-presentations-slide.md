# 15 — Présentations : l'objet `{@slider}`

## Besoin

Un tag pour faire des **présentations** (diaporamas) : un conteneur dont les
enfants `{@slider.slide:…}` sont des slides, avec des **boutons jolis** pour aller au
suivant / revenir au précédent.

## La contrainte centrale : navigation = interactivité = JS

Le moteur garde « **zéro JS depuis le contenu** » (un `{script:}` inline est
inerte). Faire défiler des slides demande pourtant du JS. La solution **dans le
respect de l'architecture** : `@slider` est un **objet de première classe hydraté
par le runtime** — exactement comme les scènes Plotly/Three. Le contenu n'émet
jamais de `<script>` ; c'est la couche JS unique et de confiance du moteur qui
câble la navigation.

## Syntaxe

```htsl
{@slider:
  {@slider.slide: {h1:Titre}}
  {@slider.slide: {h2:Une équation} {@mte: e^{i\pi}+1=0}}
  {@slider.slide: {@plot[fn="sin(x)/x", xrange="(-15,15)"]/}}
}
```

Seuls les enfants `{@slider.slide:…}` deviennent des slides ; les autres sont
**ignorés**.

## Implémentation (packages/core)

- **Registre** (`registry.ts`) : objet `slider.deck` + `slider.slide` (alias `slider`), catégorie
  `structure`, `contentModel: "html"`. Apparaît donc automatiquement dans le
  catalogue de la doc et le prompt IA.
- **`objects/slides.ts`** : `isSlidePath` + `SLIDER_DECK_PATH`/`SLIDER_SLIDE_PATH`.
- **Renderer** (`renderer.ts`, méthode `slides()`) : émet une structure
  **déclarative** —
  `<div class="htsl-deck" data-htsl-slides data-htsl-index="0" tabindex="0">`
  contenant une barre de progression, le `stage` (un `<section>` par
  `{@slider.slide:}`), et une nav (boutons `‹` / `›` / plein écran + compteur).
  Filtre les enfants qui ne sont pas des `slider.slide`.
- **Runtime** (`slides-client.ts`, branché dans `runtime.ts#hydrate`) :
  `hydrateSlides` installe **une seule fois par fenêtre** des écouteurs
  `click`/`keydown` (délégation), l'état courant vit dans `data-htsl-index`
  (donc **morph-safe**). Boutons ⟵/⟶, flèches clavier ←/→ (deck focalisé),
  plein écran (`requestFullscreen`), compteur + barre, boutons désactivés aux
  bornes. Aucune dépendance externe (pur DOM).
- **CSS** (`css.ts`, ajouté à `mathCss`) : carte stylée, fondu d'entrée
  (`@keyframes`), boutons accent, **dégradation gracieuse** (sans runtime, le
  premier slide s'affiche : `:not(.htsl-deck--ready) … :first-child`), et
  `@media print` → **un slide par page** (nav masquée) pour l'export PDF.
- **Exports** (`index.ts`) : `hydrateSlides`/`pendingSlides`/`purgeSlides`,
  `isSlidePath`, `SLIDE_PATH`.

## Vérifié

- Tests cœur **231** (5 nouveaux : path/alias, structure rendue, sections →
  slides, non-sections ignorés, `{script}` resté inerte).
- En navigateur (playground) : deck hydraté (`htsl-deck--ready`), un seul slide
  visible, clic ⟶ avance (compteur 2/3, barre 50 %, bouton désactivé en fin),
  flèche ← recule, clic ⟵ clampé au 1er ; 0 erreur console.

## Suite possible (v1.1)

Transitions au choix (glissement), mode présentateur (notes), miniatures,
conservation de l'index courant à travers une ré-édition.
