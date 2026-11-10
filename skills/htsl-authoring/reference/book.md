# Fiche — livres & romans

But : un texte long à lire et/ou imprimer (roman, nouvelle, recueil). Conteneur :
**`{@document}`** paginé, un `{@document.page}` par chapitre.

## Objets à utiliser

- `{@document[numbers=true, header="Titre du livre", footer="Auteur"]: …}` — le livre.
- `{@document.page: {h1:Chapitre N — Titre} … }` — une page/chapitre. À l'impression
  elle démarre sur une nouvelle feuille ; **si le contenu déborde, il continue tout
  seul sur la feuille suivante** (notre moteur ne coupe rien).
- Texte : `{p:…}`, `{h1 h2 h3:…}`, `{em:…}`, `{strong:…}`, `{blockquote:…}` (épigraphe),
  `{hr/}` (séparateur de scène).
- `{@panel}` sobre pour une note d'auteur ; `{figure}`+`{figcaption}` pour une image.

## Objets à ÉVITER dans un roman

Rien de pédagogique ni d'interactif : pas de `{@theorem}` `{@definition}` `{@exercise}`
`{@quiz}` `{@flashcard}` `{@reveal}` `{@stepper}`. Pas de scène Plotly/Three. Seul
compte ce qui sert la lecture : titres de chapitres, épigraphes, séparateurs.

## Cohérence : tiens une « bible » du livre

Avant d'écrire, et à relire avant chaque chapitre (mets-la à jour après) :
personnages (noms, âges, traits, façon de parler), lieux, chronologie, intrigues en
cours. Garde la **même voix narrative, le même temps, le même point de vue** sauf
choix délibéré.

## Typographie française soignée

- Guillemets `«  »` (avec espace insécable intérieure), tirets de dialogue, espace
  insécable avant `; : ! ?`, apostrophe typographique `’` (pas `'`).
- Pas d'espace juste avant un `$` fermant ; espace entre deux inline → cf. piège §3
  du `SKILL.md` (mettre un mot, ou `​ `).

## Mise en page

Page de titre (1ʳᵉ `{@document.page}` : titre + auteur), sommaire si utile, **chaque
chapitre sur sa page**, en-têtes/pieds sobres (`header`/`footer`). `numbers=true` pour
la numérotation.

## Squelette

```htsl
{@document[numbers=true, header="What Does Not Shine", footer="— roman"]:
  {@document.page:
    {h1:What Does Not Shine}
    {p:{em:un roman}}
  }
  {@document.page:
    {h1:Chapitre 1 — Le quai}
    {p:La pluie n’avait pas cessé depuis trois jours.}
    {hr/}
    {p:Plus tard, elle revint.}
  }
}
```

## Vérifs propres

- `lint` + `verify` (0 erreur, aucun objet pédagogique parasite).
- Relire la bible : noms/temps/point de vue cohérents.
- Vérif visuelle : pas de titre de chapitre seul en bas de page ; apostrophes et
  guillemets typographiques corrects.
