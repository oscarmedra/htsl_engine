# 02 — Conversion inverse HTML → HTSL

## Objectif

Ajouter au moteur la conversion **inverse** : transformer du code HTML en HTSL
(le moteur ne faisait jusque-là que HTSL → HTML).

## Choix technique

Mini-parser HTML **écrit à la main**, sans dépendance, cohérent avec l'esprit du
moteur. Fonctionne partout (Node, navigateur, tests Vitest), contrairement à une
approche basée sur le DOM du navigateur (`DOMParser`).

## Implémentation (`src/from-html.ts`)

Deux étapes réutilisant l'AST `Node` existant :

1. **`parseHtml(html)`** : parser HTML tolérant (stack d'éléments ouverts).
   Gère : éléments, attributs (quotés `"`/`'`, non quotés, booléens), balises
   void, balises auto-fermantes `/>`, commentaires `<!-- -->`, doctype/PI
   (ignorés) et les entités HTML courantes (`&amp;`, `&lt;`, numériques…).
   Ne lève jamais d'exception ; referme les balises ouvertes en fin d'entrée.
2. **`toHtsl(ast, { prettyPrint? })`** : sérialise l'AST en HTSL.
   - `class="a b"` → `.a.b`, `id="x"` → `#x` (si identifiants valides, sinon
     conservés en attributs `[...]`).
   - balises void / éléments vides → forme auto-fermante `/}`.
   - ré-échappe `{`, `}`, `:` dans le texte.
3. **`fromHtml(html, options?)`** : enchaîne les deux.

Exposées dans l'API publique et dans l'objet `htsl_engine` (donc aussi via les
globals navigateur `htsl_engine` / `HTSL_ENGINE`).

## Round-trip

`compile(fromHtml(html))` reproduit fidèlement le HTML d'origine (entités
ré-échappées, attributs, balises void, commentaires). Testé sur 6 cas.

## Limite connue (v0.1)

Les espaces purement décoratifs entre éléments inline peuvent être perdus (les
nœuds texte vides sont supprimés à la sérialisation). Le contenu significatif et
l'échappement font un aller-retour fidèle.

## Bug corrigé en cours de route

Un `<` littéral isolé (non suivi d'un nom de balise) provoquait une boucle
infinie dans `readText` (arrêt immédiat sur `<` sans avancer) — détecté par le
test « never throws on malformed input ». Corrigé en consommant toujours au
moins un caractère.

## Vérification

- `npm run typecheck` → OK
- `npm test` → **74 tests** verts (19 nouveaux dans `tests/from-html.test.ts`)
- Bundles régénérés : `fromHtml` disponible dans `dist-min/` (ESM + global).
