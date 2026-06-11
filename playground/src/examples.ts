export interface Example {
  id: string;
  label: string;
  src: string;
}

export const examples: Example[] = [
  {
    id: "formules",
    label: "Galerie de formules (composant card)",
    src: String.raw`{!-- Une carte Tailwind réutilisable, définie une seule fois --}
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
    src: String.raw`{!-- Tailwind est disponible : écrivez les classes dans [class="…"].
     Les classes à variantes (hover:, md:, w-1/2) passent aussi par l'attribut. --}
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
    id: "scene3d",
    label: "Scène 3D avec repère",
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
    label: "Document mixte (équations + références)",
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
];
