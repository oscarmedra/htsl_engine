# Fiche — présentations en diapositives

But : un exposé projeté. Conteneur : **`{@slider}`**, un `{@slider.slide}` par idée.

## Objets à utiliser

- `{@slider[transition=fade|slide|zoom, autoplay="6s", loop=true]: … }` — le deck.
  Seuls les `{@slider.slide}` enfants comptent (le reste est ignoré).
- `{@slider.slide: {h2:Titre explicite} … }` — une diapo.
- Dedans : titres `{h1 h2}`, `{p}` court, `{ul}`, `$…$`/`{@mtb}`, `{@panel}`, `{@badge}`,
  `{@columns}`+`{@col}`, encadrés `{@theorem}`/`{@definition}`, `{@stepper}`.

## Objet à ÉVITER dans un slider

⚠ **Pas de scène dynamique dans un `{@slider}`** : `{@plot}`, `{@chart}`, `{@mg2.scene}`,
`{@mg3.scene}`, `{@s3.scene}`. En **page autonome** (runtime auto + MutationObserver),
une scène Plotly/Three dans un slide peut déclencher une **boucle de ré-hydratation**
(page figée). `verify.mjs` le signale. Solutions :
- illustrer autrement (formule, `{@panel}`, `{@columns}` de badges, image `{img}`) ;
- OU sortir la scène du deck (une section à part, hors `{@slider}`) ;
- OU présenter dans le **playground** (hydratation gérée) plutôt qu'en page autonome.

## Principes

- **Une idée par diapo**, peu de texte, titre explicite.
- Vérifie que chaque diapo **tient dans sa hauteur** (aucun débordement) — étape
  visuelle, regarde plusieurs diapos en capture.
- Simplifier un deck existant : réduire le texte, garder le message principal de
  chaque diapo.

## Squelette

```htsl
{@slider[transition=fade, loop=true]:
  {@slider.slide: {h1:Énergie mécanique} {p:Chapitre 7}}
  {@slider.slide:
    {h2:Définition}
    {@mtb: E_m = E_c + E_p}
    {p:cinétique + potentielle.}
  }
  {@slider.slide:
    {h2:À retenir}
    {@panel[color=green, title="Conservation"]: {p:Sans frottement, $E_m$ se conserve.}}
  }
}
```

## Page autonome : hydratation explicite (anti-boucle)

Pour livrer un deck en page HTML autonome, **n'utilise pas le bundle auto**
(`htsl.auto.global.js`) : son `MutationObserver` peut **boucler** avec un slider
(ré-hydratation en cascade → page figée). Utilise le bundle **non-auto**
`htsl.global.js` et **hydrate toi-même, une seule fois** :

```html
<script src="https://unpkg.com/@noah-medra/htsl-core/dist-min/htsl.global.js"></script>
…
<script>
  window.addEventListener("load", function () {
    var out = document.getElementById("out");
    document.head.appendChild(
      Object.assign(document.createElement("style"), { textContent: htsl_engine.mathCss })
    );
    out.innerHTML = htsl_engine.compile(src, { katex: window.katex, prettyPrint: true });
    htsl_engine.hydrate(out);   // UNE fois — pas de MutationObserver
  });
</script>
```

Gabarit prêt : **`templates/standalone-slides.html`**. (Rappel : la build CDN publiée
peut être en retard sur le moteur local — un `{@badge}` ou un objet récent peut y être
rendu en repli math ; vérifie, et republie le paquet si besoin.)

## Vérifs propres

- `lint` + `verify` (verify alerte si une scène est dans le slider).
- Vérif visuelle **indispensable** : naviguer le deck, aucune diapo qui déborde,
  captures regardées. Tester dans un vrai navigateur, pas seulement en aperçu figé.
