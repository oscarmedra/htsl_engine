export interface Example {
  id: string;
  label: string;
  src: string;
}

export const examples: Example[] = [
  {
    id: "formules",
    label: "Galerie de formules (composant card)",
    src: String.raw`{!-- Une carte réutilisable, définie une seule fois --}
{!define card[title, color=indigo]:
  {div.card:
    {h2.card-title:{$title}}
    {div.card-body:{$children}}
  }
}

{h1:Galerie de formules}

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
