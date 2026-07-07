# 24 — Marqueurs de listes ordonnées `{ol[type=…]}`

## Objectif

Enrichir `{ol}` d'un attribut **`type`** purement présentationnel qui change le
style des marqueurs. Aucune nouvelle sémantique, aucun nouvel objet : juste une
variante de rendu de la liste ordonnée existante.

## Valeurs

| `type` | Marqueurs | Classe appliquée |
|--------|-----------|------------------|
| absent / `num` | `1.` `2.` `3.` (défaut) | *(aucune)* |
| `alpha` | `(a)` `(b)` `(c)` | `htsl-ol-alpha` |
| `Alpha` | `(A)` `(B)` `(C)` | `htsl-ol-alpha-upper` |
| `roman` | `(i)` `(ii)` `(iii)` | `htsl-ol-roman` |
| `Roman` | `(I)` `(II)` `(III)` | `htsl-ol-roman-upper` |
| `paren` | `1)` `2)` `3)` | `htsl-ol-paren` |

Valeur inconnue → repli silencieux sur le défaut (`num`), sans erreur.

## Implémentation

- **Renderer** (`renderer.ts`, `openTag`) : pour `ol`, l'attribut `type` est
  **consommé** (jamais émis en HTML brut) et mappé vers une classe via
  `OL_MARKER_CLASS`. `num`/absent/inconnu → aucune classe. La classe éventuelle
  est fusionnée avec les classes de l'auteur (`{ol.mine[type=roman]}` →
  `class="mine htsl-ol-roman"`).
- **CSS** (`objects/css.ts`, `mathCss`) : les formats sont parenthésés/`)`, que
  `list-style-type` seul ne produit pas → **compteur CSS personnalisé**
  (`counter-reset: htsl-ol` sur le `<ol>`, `counter-increment` sur les `<li>`,
  marqueur en `li::before` avec `content: "(" counter(htsl-ol, lower-alpha) ") "`).
  Le style du compteur (`lower-alpha`/`upper-alpha`/`lower-roman`/`upper-roman`/
  `decimal`) porte la variante ; `::before` en retrait négatif fait le marqueur
  pendant. Synchrone, sans dépendance.
- **Registre** : `type` documenté (enum) sur `ol` → autocomplétion + palette.

## Garanties

`{ol}` sans `type` produit **exactement** le même HTML qu'avant
(`<ol>…</ol>`) — vérifié par test. Les ajouts CSS ne ciblent que `.htsl-ol-*`,
donc un `<ol>` sans classe n'est jamais affecté.

## Tests (`tests/ol-marker.test.ts`, 11)

Défaut inchangé (HTML identique), une classe correcte par valeur de `type`,
`num` = défaut, valeur inconnue = repli, `type` jamais émis en attribut brut,
fusion avec les classes de l'auteur, et présence des règles CSS (compteurs).
Suite core : 308. Monorepo : typecheck 0, build 0, core 308 + codemirror 37.

## Vérifié en navigateur

`(a)(b)(c)`, `(i)(ii)(iii)`, `(I)(II)`, `1)2)` rendus correctement ; le `<ol>`
par défaut reste sans classe ; 0 erreur console.
