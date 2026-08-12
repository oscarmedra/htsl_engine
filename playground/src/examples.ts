import grandTour from "./grand-tour.txt?raw";

export interface Example {
  id: string;
  label: string;
  src: string;
  /** Gallery category (see TEMPLATE_CATEGORIES for the display order). */
  category?: string;
  /** One-line description shown under the title in the template gallery. */
  description?: string;
}

/** Category display order for the template gallery. */
export const TEMPLATE_CATEGORIES = [
  "Découverte",
  "Mathématiques",
  "Présentation",
  "Pédagogie interactive",
  "Mise en page (CSS)",
  "Géométrie & 3D",
  "Avancé",
] as const;

/** A large document (30 cards with formulas + 2 scenes) to demonstrate that
 *  editing one word touches a single block and never re-plots the scenes. */
function perfDoc(): string {
  const lines: string[] = [`{script[src="https://cdn.tailwindcss.com"]/}`, ``];
  // Each card is an INDEPENDENT top-level block: editing one word in one card
  // changes only that block's hash, so the morpher touches a single node.
  for (let i = 1; i <= 30; i++) {
    lines.push(
      `{div[class="bg-white ring-1 ring-slate-200 rounded-lg p-3 mb-2"]:` +
        `{h3[class="font-semibold text-indigo-600"]:Carte ${i}}` +
        `{p[class="text-slate-600"]:Paragraphe numéro ${i}, modifiez un mot ici pour tester.}` +
        `{@mti: a_{${i}}^2 + b^2 = c^2}}`,
    );
  }
  lines.push(
    ``,
    `{div[class="grid grid-cols-2 gap-3 mt-3"]:`,
    `  {@mg2.scene[width=300, height=240]:`,
    `    {@mg2.frame[xrange="(-3,3)", yrange="(-3,3)", grid=true, ticks=1]/}`,
    `    {@mg2.circle[center="(0,0)", radius=2, color=royalblue]/}`,
    `    {@mg2.point[name=O, x=0, y=0, color=crimson]/}`,
    `  }`,
    `  {@mg3.scene[width=300, height=240]:`,
    `    {@mg3.sphere[center="(0,0,0)", radius=2, color=mediumseagreen, opacity=0.5]/}`,
    `    {@mg3.point[name=A, x=1, y=1, z=1, color=crimson]/}`,
    `  }`,
    `}`,
  );
  return lines.join("\n");
}

export const examples: Example[] = [
  {
    id: "grand-tour",
    label: "Le grand tour de HTSL",
    category: "Découverte",
    description: "Toutes les capacités du moteur réunies dans un seul document.",
    src: grandTour,
  },
  {
    id: "formules",
    label: "Galerie de formules",
    category: "Mathématiques",
    description: "Un composant réutilisable qui met en carte plusieurs formules.",
    src: String.raw`{!-- Chargez le framework CSS depuis votre document (iframe isolée) --}
{script[src="https://cdn.tailwindcss.com"]/}

{!-- Une carte Tailwind réutilisable, définie une seule fois --}
{!define card[title, color=indigo]:
  {div[class="bg-white ring-1 ring-slate-200 rounded-xl p-4 mb-3 shadow-sm"]:
    {h2[class="text-lg font-semibold mb-2 text-{$color}-600"]:{$title}}
    {div[class="text-slate-700"]:{$children}}
  }
}

{h1[class="text-2xl font-bold mb-4"]:Galerie de formules}

{@card[title="Théorème de Pythagore"]:
  {@mtb: a^2 + b^2 = c^2}
}

{@card[title="Problème de Bâle", color="violet"]:
  {@mtb: \sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}}
}

{@card[title="Objets imbriqués", color="emerald"]:
  {@mtb: {@mof:{num:1}{den:2}} \cdot {@mc.pi/} = \frac{\pi}{2}}
}
`,
  },
  {
    id: "tailwind",
    label: "Mise en page Tailwind",
    category: "Mise en page (CSS)",
    description: "Composer une page avec Tailwind CSS chargé dans le document.",
    src: String.raw`{!-- On charge Tailwind ici même, dans le document --}
{script[src="https://cdn.tailwindcss.com"]/}

{!-- Écrivez les classes dans [class="…"] ; les variantes (hover:, md:, w-1/2)
     y passent aussi car . n'accepte que des identifiants simples. --}
{!set accent: indigo}

{div[class="max-w-2xl mx-auto p-4"]:
  {h1[class="text-2xl font-bold text-slate-800 mb-1"]:Tableau de bord}
  {p[class="text-slate-500 mb-4"]:Mise en page composée d'utilitaires Tailwind.}

  {div[class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4"]:
    {div[class="bg-{$accent}-50 ring-1 ring-{$accent}-200 rounded-xl p-4"]:
      {div[class="text-3xl font-bold text-{$accent}-700"]:128}
      {div[class="text-sm text-slate-500"]:Documents}
    }
    {div[class="bg-emerald-50 ring-1 ring-emerald-200 rounded-xl p-4"]:
      {div[class="text-3xl font-bold text-emerald-700"]:97%}
      {div[class="text-sm text-slate-500"]:Couverture}
    }
    {div[class="bg-rose-50 ring-1 ring-rose-200 rounded-xl p-4"]:
      {div[class="text-3xl font-bold text-rose-700"]:3}
      {div[class="text-sm text-slate-500"]:Alertes}
    }
  }

  {div[class="bg-white ring-1 ring-slate-200 rounded-xl p-5"]:
    {h2[class="text-lg font-semibold text-slate-800 mb-2"]:Formule du jour}
    {@mtb: e^{i\pi} + 1 = 0}
    {a[class="inline-block mt-3 px-3 py-1.5 rounded-lg bg-{$accent}-600 text-white text-sm hover:bg-{$accent}-700", href="#"]:En savoir plus}
  }
}
`,
  },
  {
    id: "bootstrap",
    label: "Bootstrap",
    category: "Mise en page (CSS)",
    description: "N'importe quel framework CSS (ici Bootstrap) via {link}.",
    src: String.raw`{!-- N'importe quel framework CSS : ici Bootstrap, chargé via {link} --}
{link[rel="stylesheet", href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"]/}

{div[class="container py-4"]:
  {h1[class="mb-3"]:Bootstrap dans HTSL}
  {div[class="alert alert-primary"]:Le framework est chargé depuis le document.}

  {div[class="row g-3"]:
    {div[class="col-md-4"]:
      {div[class="card"]:{div[class="card-body"]:
        {h5[class="card-title"]:Carte A}
        {p[class="card-text"]:Stylée par Bootstrap.}
      }}
    }
    {div[class="col-md-4"]:
      {div[class="card text-bg-primary"]:{div[class="card-body"]:
        {h5[class="card-title"]:Carte B}
        {p[class="card-text"]:Variante colorée.}
      }}
    }
    {div[class="col-md-4"]:
      {div[class="card border-success"]:{div[class="card-body"]:
        {h5[class="card-title text-success"]:Carte C}
        {p[class="card-text"]:Bordure de succès.}
      }}
    }
  }

  {p[class="mt-3"]:{a[class="btn btn-primary", href="#"]:Bouton} {span[class="badge bg-secondary"]:badge}}
}
`,
  },
  {
    id: "scene3d",
    label: "Scène 3D avec repère",
    category: "Géométrie & 3D",
    description: "Une scène 3D interactive (repère, plan, sphère, vecteurs).",
    src: String.raw`{h1:Scène 3D}
{@mg3.scene[width=560, height=440]:
  {@mg3.space[xrange="(-5,5)", yrange="(-5,5)", zrange="(-5,5)", grid=true, ticks=2, equal=true]/}
  {@mg3.plane[normal="(2,-1,3)", d=5, color=royalblue, opacity=0.4]/}
  {@mg3.sphere[center="(0,0,0)", radius=2, color=mediumseagreen, opacity=0.5]/}
  {@mg3.point[name=A, x=1, y=2, z=3, color=crimson]/}
  {@mg3.vector[from="(1,2,3)", to="(1,3,4)", color=darkorange]/}
  {@mg3.segment[from="(-2,-2,-2)", to="(2,2,2)", color=slategray]/}
}
`,
  },
  {
    id: "complexe",
    label: "Plan complexe",
    category: "Géométrie & 3D",
    description: "Le plan complexe avec cercle unité et points (affixes).",
    src: String.raw`{h1:Plan complexe}
{@mg2.scene[width=520, height=460]:
  {@mg2.frame[type=complex, range=4, unitcircle=true, ticks=1]/}
  {@mg2.cpoint[z="3+2i", name=A]/}
  {@mg2.cpoint[z="-1-2i", name=B]/}
  {@mg2.cpoint[z="i", name=i]/}
  {@mg2.cpoint[z="-2", name=C]/}
}
`,
  },
  {
    id: "document",
    label: "Document scientifique",
    category: "Mathématiques",
    description: "Équations numérotées et références croisées cliquables.",
    src: String.raw`{!set theme: indigo}
{h1:Document scientifique}

{p:On rappelle deux résultats classiques. D'abord l'identité d'Euler :}
{@mte[label=euler]: e^{i\pi} + 1 = 0}

{p:puis le problème de Bâle :}
{@mte[label=basel]: \sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}}

{p:Les relations {@mtr[to=euler]/} et {@mtr[to=basel]/} sont emblématiques. En ligne : $a^2 + b^2 = c^2$.}

{ul:
  {li:Léger et structuré}
  {li:Sûr (échappement XSS)}
  {li:Formules, composants, géométrie}
}
`,
  },
  {
    id: "perf",
    label: "Performance (30 cartes + 2 scènes)",
    category: "Avancé",
    description: "Démonstration : éditer un mot ne re-rend qu'un seul bloc.",
    src: perfDoc(),
  },
  {
    id: "presentation",
    label: "Présentation animée",
    category: "Présentation",
    description: "Diaporama avec transitions et défilement automatique (▶/⏸).",
    src: String.raw`{@slider[transition=fade, autoplay="8s", loop=true]:
  {@slider.slide:
    {h1:Ma présentation}
    {p:Naviguez avec ⟵ / ⟶, le plein écran, ou la lecture automatique (▶ / ⏸).}
  }
  {@slider.slide:
    {h2:Une équation}
    {@mtb: e^{i\pi} + 1 = 0}
  }
  {@slider.slide:
    {h2:Un graphe}
    {@plot[fn="sin(x)/x", xrange="(-15,15)", title="Sinus cardinal"]/}
  }
}
`,
  },
  {
    id: "cours",
    label: "Cours : théorèmes & preuves",
    category: "Mathématiques",
    description: "Encadrés sémantiques numérotés (définition, théorème, preuve).",
    src: String.raw`{h1:Continuité}

{@definition[title="Continuité en un point", label=cont]:
  {p:$f$ est continue en $a$ si $\displaystyle\lim_{x\to a} f(x) = f(a)$.}
}

{@theorem[title="Valeurs intermédiaires", label=tvi]:
  {p:Si $f$ est continue sur $[a,b]$ et $y$ est compris entre $f(a)$ et $f(b)$,
  alors il existe $c \in [a,b]$ tel que $f(c) = y$.}
}

{@proof:
  {p:On utilise la {@ref[to=cont]/} et la propriété de la borne supérieure.}
}

{@example:
  {p:$x^3 - x - 1$ admet une racine dans $[1,2]$ d'après le {@ref[to=tvi]/}.}
}

{@remark: {p:La réciproque du théorème est fausse en général.}}
`,
  },
  {
    id: "quiz",
    label: "Quiz & cartes de révision",
    category: "Pédagogie interactive",
    description: "Un QCM auto-corrigé et des cartes à retourner.",
    src: String.raw`{h1:Auto-évaluation}

{@quiz:
  {q:Quelle est la dérivée de $\sin(x)$ ?}
  {opt: $-\sin(x)$}
  {opt[correct=true]: $\cos(x)$}
  {opt: $\tan(x)$}
  {explain: On a $(\sin)' = \cos$.}
}

{h2:Cartes de révision}
{@flashcard:
  {front: $\displaystyle\int_0^1 x^2\,dx$}
  {back: $= \dfrac{1}{3}$}
}
{@flashcard:
  {front: $e^{i\pi}$}
  {back: $= -1$}
}
`,
  },
  {
    id: "graphes",
    label: "Graphes de fonctions",
    category: "Mathématiques",
    description: "Tracé d'une ou plusieurs courbes $y = f(x)$.",
    src: String.raw`{h1:Graphes de fonctions}

{@plot[fn="x^2 - 2", xrange="(-3,3)", title="Une parabole"]/}

{h2:Plusieurs courbes}
{@plot[xrange="(-6,6)", title="sin et cos"]:
  {@plot.curve[fn="sin(x)", color=crimson]/}
  {@plot.curve[fn="cos(x)", color=royalblue]/}
}
`,
  },
  {
    id: "pas-a-pas",
    label: "Résolution pas à pas",
    category: "Mathématiques",
    description: "Étapes numérotées {@stepper} + encadré neutre {@panel}.",
    src: String.raw`{h1:Résoudre une équation du second degré}

{@panel[color=indigo, title="Objectif"]:
  {p:Résoudre $x^2 - 2x - 3 = 0$ et interpréter les solutions.}
}

{@stepper:
  {@step[title="Identifier les coefficients"]:
    {p:$a = 1$, $\ b = -2$, $\ c = -3$.}
  }
  {@step[title="Calculer le discriminant"]:
    {@mtb: \Delta = b^2 - 4ac = (-2)^2 - 4(1)(-3) = 16}
  }
  {@step[title="Appliquer la formule"]:
    {@mtb: x = \frac{-b \pm \sqrt{\Delta}}{2a} = \frac{2 \pm 4}{2}}
  }
  {@step[title="Conclure"]:
    {p:Les solutions sont $x_1 = 3$ et $x_2 = -1$.}
  }
}

{@panel[color=green, title="À retenir"]:
  {p:Le signe de $\Delta$ donne le nombre de racines réelles.}
}
`,
  },
];
