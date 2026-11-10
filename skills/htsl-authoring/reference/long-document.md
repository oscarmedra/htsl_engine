# Fiche — documents longs : cours, manuels, rapports

But : un document structuré à lire/imprimer. Conteneur : **`{@document}`**, un
`{@document.page}` par chapitre/section majeure.

## Objets à utiliser

- Encadrés numérotés : `{@definition}` `{@theorem}` `{@lemma}` `{@corollary}`
  `{@proposition}` `{@property}` `{@example}` `{@proof}` `{@remark}` `{@warning}`
  `{@notation}` `{@algorithm}` — renvoi via `{@ref[to=label]/}`.
- Maths : `$…$`, `{@mtb}`, `{@mte[label=]}` + `{@mtr[to=]}`, `{@mta}` `{@mts}` `{@mtc}`,
  `{@mof}` `{@mom}` `{@mov}`, `{@qty[value=,unit=]/}`, `{@ce:…}` (chimie).
- Structure : `{h1 h2 h3}`, `{ol[type=alpha|roman|…]}`, `{@columns}`+`{@col}`,
  `{@deflist}` (glossaire), `{@timeline}`, `{@codeblock[lang=]}`, `{table}`.
- Données/visuel : `{@plot}`, `{@chart}`, `{@variations}`, `{@signs}`, `{@numberline}`,
  `{@truthtable}`, scènes `{@mg2/mg3}`. **Hors d'un `{@slider}`** (ici on n'en a pas).

## Modèle de chapitre (cours) — stable

Objectifs → introduction → définitions (avec intuition) → théorèmes → démonstrations
→ exemples et contre-exemples → méthodes → exercices (3 niveaux) → QCM → résumé.
Annonce les notations/termes clés au début et sois cohérent ensuite.

## Impression (`{@document}`) — règles

- Notre moteur **fait couler** le trop-plein d'une page sur la suivante (rien n'est
  coupé) : tu n'as pas à mesurer au pixel. Mais garde une page = une unité logique
  (un chapitre) et évite les blocs géants indivisibles.
- **Rien d'interactif sur papier** : un `{@quiz}` ou un `{@reveal}` n'a pas de sens
  imprimé → mets les **corrigés en texte statique** (ex. regroupés en fin de chapitre).
- Un titre ne reste jamais seul en bas de page (vérif visuelle) ; chaque chapitre
  commence sur une nouvelle `{@document.page}` ; le sommaire se fige en dernier.
- `header`/`footer`/`grid` sur `{@document}` ; surchargeables page par page.

## Rigueur du contenu

Tout résultat chiffré est **vérifié par du code** (Python/sympy/numpy) avant d'être
écrit ; tout code inclus est exécuté. Pas de texte auto-correctif (« …non, en
fait… ») : réécris proprement.

## Squelette

```htsl
{@document[numbers=true, header="Analyse — L1"]:
  {@document.page:
    {h1:Chapitre 1 — Limites}
    {@panel[color=indigo, title="Objectifs"]: {ul:{li:Définir la limite d’une suite.}}}
    {@definition[title="Limite finie", label=lim]:
      {p:$\lim_{n\to\infty} u_n = \ell$ si tout intervalle ouvert contenant $\ell$
      contient tous les $u_n$ à partir d’un rang.}
    }
    {@example: {p:$u_n = 1/n \to 0$ par {@ref[to=lim]/}.}}
  }
}
```

## Vérifs propres

- `lint` + `verify` (formules valides, aucun objet inconnu, `{@ref}`/`{@mtr}` corrects).
- Checklist du plan fourni relue point par point.
- Vérif visuelle : pas de titre orphelin, rien qui déborde en largeur, tableaux lisibles.
