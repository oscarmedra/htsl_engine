# Fiche — pages web interactives

But : une page en ligne pour s'entraîner / explorer. Pas de conteneur paginé : on
profite de l'interactivité (gérée par le runtime).

## Objets à utiliser

- **Pédagogie active** : `{@quiz}` (`{q}` + `{opt[correct=true]}` + `{explain}`),
  `{@flashcard}` (`{front}`/`{back}`), `{@reveal[title=]}` (spoiler), `{@exercise}`
  (avec `{solution:…}`), `{@stepper}`+`{@step}` (`guided=true` pour révéler pas à pas),
  `{@checklist}`.
- **Navigation** : `{@tabs}`+`{@tabs.tab[title=]}`, `{@columns}`.
- **Interactif visuel** : `{@param[name=,min=,max=]/}` + `{@plot}` (le graphe suit le
  curseur), scènes `{@s3.scene[controls=true]}`, `{@mg2/mg3}`, `{@chart}`.
  (Ici c'est permis : **pas de `{@slider}` autour** → pas de boucle de ré-hydratation.)

## Principes

- Exploite vraiment l'interactivité : explications au clic, éléments à déplier,
  onglets, étapes.
- **Teste en largeur mobile** : un tableau ou une formule large doit **défiler** (dans
  un conteneur `{div}` scrollable) au lieu de déborder.
- Page autonome : charge Plotly si `{@mg2/mg3/plot/chart}` ; Three.js est chargé seul
  pour `{@s3}`.

## Squelette

```htsl
{h2:Influence du coefficient}
{@param[name="a", min=-3, max=3, step=0.1, value=1, label="a"]/}
{@plot[fn="a*x^2", xrange="(-4,4)", title="y = a·x²"]/}

{@tabs:
  {@tabs.tab[title="Quiz"]:
    {@quiz:
      {q:Dérivée de $x^2$ ?}
      {opt[correct=true]: $2x$}
      {opt: $x$}
      {explain: $(x^n)' = n x^{n-1}$.}
    }
  }
  {@tabs.tab[title="Fiche"]:
    {@reveal[title="Méthode"]: {p:On applique la règle de puissance.}}
  }
}
```

## Vérifs propres

- `lint` + `verify`.
- Vérif visuelle : cliquer quiz/reveal/onglets, bouger le curseur, **tester en mobile**
  (rien qui déborde, le large défile).
