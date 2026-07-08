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

## Extension : jeu d'encadrés complet (2026)

Le jeu initial (théorème, définition, propriété, exemple, preuve, remarque,
attention) a été complété pour couvrir les environnements mathématiques usuels.
L'architecture étant centralisée dans `CALLOUT_TYPES` (`objects/callout.ts`),
chaque ajout = **une ligne** (le registre, la numérotation, `{@ref}` et
l'autocomplétion en découlent) + **un ton CSS** dans `mathCss`.

Ajoutés — **numérotés** (compteur par type) : `proposition`, `lemme` (`lemma`),
`corollaire` (`corollary`, `cor`), `assertion` (**Claim → Assertion**),
`conjecture`, `axiome` (`axiom`), `construction`, `algorithme` (`algorithm`).
**Non numérotés** : `notation`, `observation` (`obs`).

**Assumption & Hypothesis** → un **seul** environnement « Hypothèse » (alias
`hypothesis`, `assumption`, `hypothese`, `hyp`) avec un **compteur partagé** —
plutôt que deux « Hypothèse 1 » concurrents.

Chaque nouveau type a son ton coloré (`htsl-callout-<tone>`) ; `algorithme` a un
en-tête en police monospace. Tests : `callout.test.ts` porté à **13**
(jeu étendu, notation/observation non numérotés, compteur partagé Hypothèse,
classes de ton, renvoi vers les nouveaux types). Vérifié en navigateur (10
encadrés, couleurs distinctes, KaTeX à l'intérieur, 0 erreur).
