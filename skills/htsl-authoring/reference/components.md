# Fiche — composants personnalisés

But : factoriser le balisage répété (badges, en-têtes de partie, encadrés maison)
plutôt que de recopier. Détails complets : `syntax.md` § Composants & variables.

## Principe

```htsl
{!define nom[param1, param2=defaut]:
  … balisage utilisant {$param1}, {$param2} et {$children} …
}
{@nom[param1="x"]: contenu → {$children}}
```

- Résolu par **expansion d'AST avant le rendu** (le moteur ne voit que des nœuds normaux).
- `{$children}` = le contenu passé à l'usage. Il n'est utilisable **que dans un corps
  de composant** — jamais dans le texte d'un usage (erreur localisée).
- Paramètres avec défauts (`color=indigo`) ; un requis manquant = erreur.
- Utilisable **avant** sa définition ; récursion infinie détectée.
- Le nom partage le registre `@` : **collision avec un objet existant** (ex. `mti`,
  `panel`, `page`) = erreur → choisis un nom libre.

## Variables document

```htsl
{!set theme: indigo}
{p[class="text-{$theme}-600"]:{$theme}}
```

`{$name}` s'interpole dans texte, **valeurs d'attributs** et corps de composants. Une
valeur **entre guillemets** est prise verbatim (idéale pour une macro LaTeX) :
`{!set H: "\tfrac12(p^2+\omega^2 q^2)"}` puis `{@mtb: H = {$H}}`.

## Quand en créer

Dès qu'un même motif revient 3 fois (un encadré « compétence », un en-tête de partie,
un badge de niveau…). Un composant bien nommé rend le document plus court et cohérent.

## Exemple

```htsl
{!define competence[code]:
  {@panel[color=teal, title="Compétence {$code}"]: {$children}}
}
{@competence[code="A1"]: {p:Résoudre une équation du premier degré.}}
{@competence[code="A2"]: {p:Factoriser une expression simple.}}
```

## Vérifs propres

- `lint` + `verify` : un `{$children}` mal placé ou une collision de nom lèvent une
  erreur captée par `lint`.
