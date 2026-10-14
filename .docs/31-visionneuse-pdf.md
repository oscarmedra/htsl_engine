# Visionneuse PDF `{@pdf[src]/}`

## Idée

Afficher un PDF depuis un lien, à l'écran, avec le lecteur **natif** du navigateur —
sans dépendance, sans fetch CORS (l'embed affiche sans télécharger), en vrai vectoriel.
Choisi après évaluation plutôt que la version lourde `{@document[src]}` (PDF.js,
découpage/intercalage) : trop de risque (CORS, raster, dépendance ~1–2 Mo, couplage à
`{@document}`) pour un usage de niche.

## Usage

```
{@pdf[src="https://…/cours.pdf", page=12, height=480]/}
```
- `src` (requis) : lien http / https.
- `page` : ouvre directement à ce numéro (via le fragment `#page=N`, standard des
  lecteurs PDF).
- `height` : hauteur d'affichage (`600px` par défaut ; nombre nu → px ; `80vh`, `%`…).
- Alias : `{@visionneuse}`. Vit n'importe où, y compris dans un `{@document}`.

## Rendu

`renderer.pdfView()` émet `<figure class="htsl-pdf"><iframe class="htsl-pdf-frame"
src="…#page=N" style="height:…"><a class="htsl-pdf-open" href="…" target="_blank">`.
Le lien « 📄 Ouvrir le PDF » est un **repli** visible (si le serveur interdit l'iframe
via `X-Frame-Options` ou force le téléchargement). Contenu `void` (auto-fermant).

## Sécurité

L'URL passe par `isAttrSafe("src", url)` (réutilisé de `sanitize.ts`) : les schémas
`javascript:` / `data:` / `vbscript:` sont rejetés → affichage d'un encadré d'erreur
au lieu de l'iframe. `height` est validée par regex (`\d+(px|rem|em|vh|%)?`) avant
d'entrer dans le `style` (pas d'injection CSS), sinon `600px`.

## Limites assumées

1. **Visionneuse écran** : un PDF embarqué ne s'imprime pas dans *ton* export PDF
   (quirk navigateur) → `@media print { .htsl-pdf-frame { display: none } }`, seul le
   lien reste.
2. **Lien éphémère** : on lie, on ne copie pas → si le lien meurt/bloque, l'affichage
   casse (le lien de repli reste cliquable).
3. Certains serveurs interdisent l'iframe ou forcent le téléchargement → le repli
   prend le relais.

## Tests

`tests/paged-document.test.ts` (+4) : iframe + src + lien de repli ; `#page=N` ;
validation height (nombre→px, unité conservée, valeur douteuse→600px) ; rejet
`javascript:`. Suite : 410. Vérifié navigateur (src/#page/height corrects, 0 erreur ;
le cadre reste sombre dans le panneau isolé de l'app, le lecteur natif l'affiche dans
un vrai navigateur).

## Affichage minimal (barre d'outils masquée par défaut)

Le but étant juste d'afficher, le lecteur est **minimal par défaut** : le fragment
reçoit `toolbar=0&navpanes=0&scrollbar=0` (paramètres d'URL du lecteur PDF, supportés
par Chrome/Brave/Edge) → plus de barre d'outils ni de volets. Attribut `toolbar=true`
pour réafficher les contrôles complets (zoom, pages…). Les `&` du fragment sont
échappés en `&amp;` dans le HTML (correct ; le navigateur les redécode). Best-effort
selon le lecteur du navigateur (Firefox/PDF.js gère ces paramètres différemment).
Tests → 411.
