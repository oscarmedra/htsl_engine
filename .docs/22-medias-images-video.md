# 22 — Médias : images, vidéos, audio, embeds

## Objectif

Afficher des **images** et **vidéos** (et audio / iframes) de première classe,
comme le reste des objets HTSL : autocomplétion, snippets, validation d'attributs
et documentation. Avant, seul `{img}` était enregistré ; vidéo/audio/iframe
« marchaient » uniquement parce que le moteur n'a pas de liste blanche de balises,
mais sans aide à l'édition ni attributs booléens propres.

## Éléments enregistrés (`registry.ts`)

| Objet | Usage | Notes |
|---|---|---|
| `img` | `{img[src="a.png", alt="x", width=400]/}` | `src` obligatoire ; `alt`/`width`/`height` optionnels |
| `figure` | `{figure:{img…/}{figcaption:…}}` | image + légende |
| `figcaption` | `{figcaption:Légende}` | |
| `video` | `{video[src="f.mp4", controls]:}` | `controls/autoplay/loop/muted/playsinline` booléens ; `poster/width/height` |
| `audio` | `{audio[src="s.mp3", controls]:}` | `controls/autoplay/loop/muted` |
| `source` | `{source[src="f.mp4", type="video/mp4"]/}` | dans `{video}`/`{audio}` ; `src` obligatoire |
| `iframe` | `{iframe[src="…/embed/ID", width="560", height="315", allowfullscreen]/}` | embeds (YouTube, carte…) |

`iframe` n'est pas un *void element* : `{iframe[…]/}` rend bien `<iframe …></iframe>`
(balise appariée). `img`/`source` sont des void tags (rendus sans fermeture).

## Attributs booléens nus (parser + renderer)

- **Parser** (`parser.ts`) : un attribut sans `=valeur` (`[controls]`) est accepté
  et stocké `"true"` — plus l'erreur « "=" attendu après … ». La forme
  `[controls=true]` reste valide et équivalente.
- **Renderer** (`renderer.ts`) : un jeu `BOOLEAN_ATTRS` (controls, autoplay, loop,
  muted, playsinline, allowfullscreen, disabled, hidden, open, selected, checked,
  required, readonly, multiple, …) est émis **nu** quand la valeur n'est pas
  `"false"` (`<video controls>`), et **omis** si `"false"`. Les autres attributs
  restent `name="valeur"`. Sortie HTML idiomatique.

C'est une amélioration rétro-compatible : un `{video[controls=true]}` existant
produit désormais `<video controls>` au lieu de `<video controls="true">` (les
deux sont valides ; le nu est la forme canonique).

## Sécurité

Inchangé : le moteur n'exécute aucun JS. Les médias sont du HTML natif rendu par
le navigateur (lecteur `<video>`/`<audio>`, `<iframe>`). L'iframe de rendu du
playground n'est pas sandboxée → médias et embeds se chargent normalement.

## Tests (`tests/media.test.ts`, 13)

Image/figure/figcaption, vidéo + `{source}`, audio, iframe (self-closing →
balise appariée), enregistrement dans la palette, et attributs booléens
(nu / `=true` / `=false` / non-booléen `name=value`). Suite core : 275.

## Vérifié en navigateur

Une image data-URI se décode et s'affiche (`naturalWidth>0`) ; `{figure}`/
`{figcaption}`, `<video controls>` + `<source>` et un `<iframe>` sont bien
présents dans le rendu ; autocomplétion des nouvelles balises ; 0 erreur console.
