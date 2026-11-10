# Recettes HTSL — exemples complets

Modèles réalistes à copier et adapter. Chaque bloc est du **source HTSL** : colle-le
dans le playground, ou dans le `<script type="text/htsl">` de
`templates/standalone.html` pour une page autonome.

---

## 1. Un cours (lecture)

```htsl
{h1:Les suites arithmétiques}

{p:Une suite $(u_n)$ est {strong:arithmétique} de raison $r$ si, pour tout $n$,
$u_{n+1} = u_n + r$.}

{@definition[title="Suite arithmétique", label=def-arith]:
  {p:$(u_n)$ est arithmétique de raison $r \in \mathbb{R}$ lorsque
  {@mtb: u_{n+1} = u_n + r \quad \text{pour tout } n \in \mathbb{N}.}}
}

{@property[label=terme]:
  {p:Terme général : {@mte[label=tg]: u_n = u_0 + n\,r.}}
}

{@example:
  {p:Si $u_0 = 2$ et $r = 3$ : $u_0=2,\ u_1=5,\ u_2=8,\dots$ La propriété
  {@ref[to=terme]/} donne $u_{10} = 2 + 10\times 3 = 32$.}
}

{@remark:
  {p:La somme des premiers termes vaut
  {@mtb: \sum_{k=0}^{n} u_k = (n+1)\,\frac{u_0 + u_n}{2}.}}
}

{@warning:
  {p:Ne pas confondre avec une suite {em:géométrique}, où l'on {em:multiplie}
  par la raison.}
}
```

---

## 2. Une fiche d'exercices (avec corrections repliables)

```htsl
{h1:Fiche — équations du second degré}

{@exercise[title="Résolution"]:
  {p:Résoudre dans $\mathbb{R}$ : $x^2 - 2x - 3 = 0$.}
  {solution:
    {@stepper:
      {@step[title="Discriminant"]: {@mtb: \Delta = (-2)^2 - 4\times 1\times(-3) = 16.}}
      {@step[title="Racines"]: {@mtb: x = \frac{2 \pm \sqrt{16}}{2}.}}
      {@step[title="Conclusion"]: {p:$x_1 = 3$ et $x_2 = -1$.}}
    }
  }
}

{@exercise[title="Sous-questions"]:
  {ol[type=alpha]:
    {li:Montrer que la suite est croissante.}
    {li:En déduire qu'elle converge.}
    {li:Calculer sa limite.}
  }
  {solution: {p:Voir le cours sur la monotonie.}}
}

{@reveal[title="Rappel de méthode"]:
  {p:Toujours vérifier le signe de $\Delta$ avant de conclure sur le nombre de
  solutions.}
}
```

---

## 3. Un diaporama (slides projetables)

```htsl
{@slider[transition=fade, loop=true]:
  {@slider.slide:
    {h1:Énergie mécanique}
    {p:Chapitre 7 — Première spécialité}
  }
  {@slider.slide:
    {h2:Définition}
    {@mtb: E_m = E_c + E_p}
    {p:somme de l'énergie cinétique et de l'énergie potentielle.}
  }
  {@slider.slide:
    {h2:Conservation}
    {@panel[color=green, title="À retenir"]:
      {p:En l'absence de frottements, $E_m$ se conserve.}
    }
  }
}
```

---

## 4. Un document imprimable / PDF (polycopié paginé)

```htsl
{@document[numbers=true, header="Mathématiques — Terminale", footer="Lycée"]:
  {@document.page:
    {h1:Chapitre 1 — Limites}
    {p:Introduction aux limites de suites et de fonctions.}
    {@definition[title="Limite finie"]:
      {p:$\lim_{n\to\infty} u_n = \ell$ si tout intervalle ouvert contenant
      $\ell$ contient tous les $u_n$ à partir d'un certain rang.}
    }
  }
  {@document.page:
    {h1:Chapitre 2 — Continuité}
    {p:La suite du cours…}
  }
}
```

> À l'impression (Ctrl/Cmd+P), chaque `{@document.page}` démarre sur une nouvelle
> feuille ; le trop-plein continue tout seul sans rien couper.

---

## 5. Une démo interactive (graphe + curseur)

```htsl
{h2:Influence du coefficient}

{@param[name="a", min=-3, max=3, step=0.1, value=1, label="a"]/}
{@plot[fn="a*x^2", xrange="(-4,4)", title="y = a·x²"]/}

{p:Bouge le curseur : la parabole $y = a\,x^2$ se met à jour en direct.}
```

Plusieurs courbes sur un même graphe :

```htsl
{@plot[xrange="(-6.28,6.28)", title="Fonctions trigonométriques"]:
  {@plot.curve[fn="sin(x)", label="sin"]/}
  {@plot.curve[fn="cos(x)", label="cos"]/}
}
```

---

## 6. Géométrie 2D et 3D

```htsl
{!-- Cercle trigonométrique --}
{@mg2.scene:
  {@mg2.frame[xrange="(-1.5,1.5)", yrange="(-1.5,1.5)", grid=true, equal=true]/}
  {@mg2.circle[center="(0,0)", radius=1, color=indigo]/}
  {@mg2.point[x=0.707, y=0.707, name="M", color=crimson]/}
}

{!-- Surface animée en 3D (Three.js, chargé seul) --}
{@s3.scene[height=420, controls=true]:
  {@s3.axes[size=3]/}
  {@s3.surface[z="sin(x)*cos(y)", xrange="(-3,3)", yrange="(-3,3)", color="#60a5fa"]/}
}
```

---

## 7. Quiz & flashcards (auto-correction au clic)

```htsl
{@quiz:
  {q:Quelle est la dérivée de $x \mapsto x^2$ ?}
  {opt[correct=true]: $2x$}
  {opt: $x$}
  {opt: $x^2/2$}
  {explain: On applique $(x^n)' = n\,x^{n-1}$.}
}

{@flashcard:
  {front: $\displaystyle \int_0^1 x^2\,dx = \;?$}
  {back: $\displaystyle \frac{1}{3}$}
}
```

---

## 8. Tableaux de variations / signes / vérité

```htsl
{@variations[var="x", fn="f(x)"]:
  {pt[x="-\\infty", y="+\\infty"]/} {down/}
  {pt[x="0", y="-3"]/} {up/}
  {pt[x="+\\infty", y="+\\infty"]/}
}

{@signs[var="x", fn="x-2"]:
  {pt[x="-\\infty"]/} {s: -} {pt[x="2", zero=true]/} {s: +} {pt[x="+\\infty"]/}
}
```

---

## 9. Composant réutilisable (DRY)

```htsl
{!define exo[num, points=1]:
  {@panel[color=indigo, title="Exercice {$num} ({$points} pt)"]:
    {$children}
  }
}

{@exo[num=1, points=2]: {p:Calculer $2+2$.}}
{@exo[num=2]: {p:Factoriser $x^2-1$.}}
```
