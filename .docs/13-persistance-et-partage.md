# 13 — Persistance & lien partageable (sans serveur)

## Problème

Le playground est une app statique : un document créé **disparaissait au
rafraîchissement** de la page, et il n'existait aucun moyen de le partager. On
voulait enregistrer le travail **et** obtenir un lien transmissible à n'importe
qui, **sans backend ni compte**.

## Solution retenue (choisie avec l'utilisateur)

« Local + lien compressé (sans serveur) » — deux mécanismes complémentaires,
entièrement côté client (`playground/src/persistence.ts`).

### Auto-save (localStorage)

- À chaque frappe (débattu, même boucle que le rendu), le document est écrit
  dans `localStorage` sous la clé `htsl:doc` (`saveLocal`).
- Au démarrage, `initialDoc()` charge `loadLocal()` si présent → **F5 ne perd
  jamais le travail**. Repli sur le premier exemple si rien n'est stocké.
- Tolérant aux pannes : `try/catch` (quota dépassé, navigation privée) → ignoré.

### Lien partageable compressé (`#z=`)

- **Partager** encode **tout le document dans l'URL** : `gzip` via
  `CompressionStream` → `Uint8Array` → **base64url** (`+/=` remplacés, sans
  padding, sûr en hash) → `#z=…`. Le lien est copié dans le presse-papier.
- Ouvrir le lien : au chargement, `hasCompressedHash()` détecte `#z=`,
  `decodeCompressedHash()` **décompresse** (`DecompressionStream`) de façon
  asynchrone et `applyDoc()` injecte le document. Le hash est ensuite **nettoyé**
  (la première édition fait un `history.replaceState` vers l'URL propre).
- **Rétrocompat** : un ancien format **non compressé** `#s=` (base64 de
  `encodeURIComponent`) reste décodé synchroniquement (`decodeLegacyHash`).
- **Repli** : si `CompressionStream`/`DecompressionStream` manquent (navigateur
  ancien), `buildShareUrl` retombe sur `#s=`.

## Détails d'implémentation

- `buildShareUrl` est `async` (gzip via `Response(stream).arrayBuffer()`), tout
  comme `decodeCompressedHash`. Le bouton Partager `await` l'URL avant la copie.
- L'hydratation depuis le hash est asynchrone (`hydrateFromHash`) et lancée
  après le premier rendu ; la priorité au boot est : `#s=` (sync) > `#z=`
  (async, doc vide en attendant) > `localStorage` > exemple.
- Pourquoi gzip plutôt que base64 brut : pour les documents un peu volumineux
  (scènes 3D, beaucoup de répétitions) la compression **réduit fortement** la
  taille du hash ; même sur un petit document, le base64url du gzip reste plus
  court que le base64 brut (l'overhead gzip est compensé par l'encodage url-safe
  sans padding).

## Vérifié en navigateur

- **Auto-save** : taper « Mon document persistant » puis **F5** → le document est
  restauré (et non l'exemple).
- **Round-trip du lien** : Partager copie un lien `#z=…` (compressé) ; vider le
  `localStorage`, changer le document, puis **ouvrir le lien** (rechargement avec
  le hash) restaure exactement le document partagé, après quoi le hash est
  nettoyé. 0 erreur.

## Garanties

Aucune dépendance ajoutée, aucun serveur. Le cœur (`packages/core`) et
`@noah-medra/htsl-codemirror` sont inchangés — c'est purement de la plomberie playground.
