# 16 — Encadrés sémantiques (lot 1 « pédagogie »)

## Besoin

La brique qui manquait pour un vrai **cours de maths** : des encadrés
**théorème / définition / propriété / exemple / démonstration / remarque /
attention**, stylés et **auto-numérotés** — l'équivalent d'`amsthm` (LaTeX).

## Objets

`{@theorem}`, `{@definition}`, `{@property}`, `{@example}` (numérotés) ;
`{@proof}`, `{@remark}`, `{@warning}` (non numérotés). Alias FR : `theoreme`/`thm`,
`def`, `propriete`/`prop`, `exemple`/`ex`, `preuve`/`demo`, `remarque`/`rem`,
`attention`. Attributs : `title="…"` (affiché après le numéro), `label=…` (cible
de renvoi). Renvoi : `{@ref[to=label]/}` → « Théorème N » (lien vers l'encadré).

```htsl
{@theorem[title="Pythagore", label=pyth]:
  {p:Dans un triangle rectangle : $$a^2+b^2=c^2$$}
}
{@proof: {p:On découpe le carré de côté $a+b$…}}
{p:D'après {@ref[to=pyth]/}, …}
```

## Implémentation (packages/core)

- **`objects/callout.ts`** : table `CALLOUT_TYPES` (path FR, `numbered`, `tone`,
  aliases), `isCalloutPath`/`calloutType`/`calloutId`, et **`buildCalloutContext`**
  — un pré-walk qui numérote **par type** (compteurs séparés) et enregistre les
  labels (pour les renvois, y compris **en avant**).
- **Registre** (`registry.ts`) : les 7 encadrés (catégorie `document`, modèle
  `html`) sont enregistrés par boucle sur `CALLOUT_TYPES` + l'objet `callout.ref`
  (alias `ref`). Donc présents au catalogue + prompt IA automatiquement.
- **Renderer** (`renderer.ts`) : `this.calloutCtx = buildCalloutContext(nodes)`
  dans `renderTop`. `callout()` émet
  `<div class="htsl-callout htsl-callout-<tone>" [id]><div class="htsl-callout-head">
  Type N — Titre</div><div class="htsl-callout-body">…</div></div>` ; un encadré
  labellisé reçoit un `id` (ancre). `calloutRef()` rend
  `<a class="htsl-ref" href="#…">Type N</a>` (ou un marqueur inerte si le label
  est inconnu). Pur HTML, **aucun JS**.
- **CSS** (`mathCss`) : carte par type (bordure gauche + en-tête teinté), `∎` en
  fin de `proof`, `break-inside: avoid` (impression), style du lien `.htsl-ref`.

## Vérifié

- Tests cœur **239** (8 nouveaux : numérotation par type, titre, non-numérotés,
  renvoi avant, renvoi inconnu inerte, alias FR).
- Navigateur : 5 encadrés stylés avec **formules KaTeX à l'intérieur** (Théorème 1
  — Pythagore, Définition 1, Exemple 1, Démonstration ∎, Attention) et renvoi
  « Théorème 1 » cliquable ; 0 erreur console ; typecheck OK.

## Suite (feuille de route « pédagogie »)

Lot 2 : `@reveal` + `@tabs`. Lot 3 : `@quiz` + `@flashcard`. Lot 4 : `@chart`.
Lot 5 : `@variations` + `@signs`. Lot 6 : paramètre interactif.
