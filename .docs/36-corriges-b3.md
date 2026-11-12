# Corrigés regroupés & QCM statique (retour B3)

Les contenus interactifs (solutions d'exercice, quiz) étaient invisibles ou
interactifs à l'impression. Deux ajouts (en plus du dépliage des `<details>` déjà en
place via le runtime).

## `{@corriges}` (alias `{@solutions}`)

Regroupe les **solutions des `{@exercise}`** et les **réponses des `{@quiz}`** qui le
précèdent (depuis le dernier `{@corriges}`), avec un **renvoi** depuis chaque exercice
(« → voir le corrigé ») et un retour (↩). À placer en fin de chapitre ou de document.
Attribut `title` (défaut « Corrigés »).

- Un exercice **suivi** d'un `{@corriges}` affiche un lien vers son corrigé (au lieu du
  dépliable). Sans `{@corriges}`, le dépliable inline est conservé.
- Les réponses de quiz sont listées par lettre (« Réponse : B, C ») + l'explication.
- Plusieurs `{@corriges}` → regroupement **par section** (un par chapitre).

Implémentation : `objects/corriges.ts` — `buildCorrigeContext(nodes)` numérote exercices
et quiz en ordre, leur donne des ancres (`htsl-exo-N` / `htsl-corrige-exo-N`) et les
rattache au prochain `{@corriges}`. `renderer.corriges()` / `corrigeItem()` produisent
la section. Les numéros d'exercice sont pris du contexte (cohérents avec le renvoi).

## QCM statique à l'impression

Les options de quiz reçoivent une **lettre** (A., B., …). En `@media print`, elles
deviennent une liste **statique** (non interactive, non surlignée) — la bonne réponse
n'est pas marquée inline : elle vit dans `{@corriges}`.

Tests : `corriges.test.ts` (inline sans corrigés, lien+renvoi, réponse quiz, lettres,
par section). Suite 456.
