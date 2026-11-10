---
name: htsl-authoring
description: >-
  Rédige des ressources pédagogiques en HTSL (HyperText Structured Language) et
  les livre, soit en source HTSL propre à coller dans le playground, soit en page
  HTML autonome prête à ouvrir. À utiliser dès qu'on demande de créer un cours,
  une fiche d'exercices, un polycopié, un diaporama/slides, un quiz, des
  flashcards, un document/livre paginé ou PDF, avec formules mathématiques
  (KaTeX), géométrie 2D/3D animée (Plotly/Three.js), graphes de fonctions,
  tableaux de variations/signes, encadrés (théorème, définition, exemple…),
  frises, ou toute « ressource de présentation et de rédaction pédagogique ».
  Déclencheurs : HTSL, .htsl, cours, exercice, polycopié, diaporama, fiche,
  théorème, formule, géométrie, quiz, flashcard, slides.
---

# Rédiger en HTSL

HTSL (**HyperText Structured Language**) compile un balisage léger `{tag:contenu}`
en HTML, avec en prime : formules maths (KaTeX), géométrie 2D/3D et graphes
(Plotly / Three.js), encadrés pédagogiques numérotés, slides, quiz, flashcards,
documents paginés… C'est un outil de **rédaction et de présentation de ressources
pédagogiques**. Ce skill t'apprend à l'écrire correctement et à le **livrer**.

## 1. La syntaxe en 30 secondes

```
{tag:contenu}                      → <tag>contenu</tag>
{tag.classe1.classe2:contenu}      → classes CSS
{tag#monId:contenu}                → id
{tag[a=1, b="val 2"]:contenu}      → attributs
{img[src="a.png"]/}                → élément auto-fermant (pas de contenu)
{@objet[attrs]:contenu}            → objet riche (maths, scène, encadré…)
{@objet[attrs]/}                   → objet auto-fermant
{!-- commentaire --}               → aucune sortie
$formule$   et   $$formule$$       → raccourcis maths inline / bloc
\{  \}  \:  \$                     → caractères littéraux (échappement)
```

L'imbrication est illimitée : `{div#main.box[data-x=1]: {h1:Titre} {p:…}}`.

**Deux familles de briques** :
- **éléments HTML** écrits en HTSL : `h1 h2 h3 p ul ol li table strong em code
  a img figure blockquote div…` (voir `reference/objects.md`).
- **objets `@`** : tout le reste (maths, géométrie, encadrés, slides, quiz…),
  introspectés depuis le moteur. Ils ont alias, attributs et exemples.

## 2. Méthode (à suivre à chaque demande)

1. **Cerner l'intention pédagogique** : est-ce un cours à lire, une fiche
   d'exercices, un diaporama projeté, un document à imprimer/PDF, une démo
   interactive ? Cela détermine les objets conteneurs (§3) et le livrable (§4).
2. **Choisir les objets justes** plutôt que du HTML brut : un théorème →
   `{@theorem}`, pas `{div.theorem}` ; une correction → `{@reveal}` ou
   `{solution:…}` d'un `{@exercise}` ; des étapes → `{@stepper}`. La liste
   complète (125 objets, attributs, exemples) est dans
   **`reference/objects.md`** — consulte-la, ne devine pas un attribut.
3. **Écrire le HTSL** proprement, indenté, un bloc par idée. Pour les maths,
   la géométrie, les composants/variables et les pièges, lis
   **`reference/syntax.md`**.
4. **Livrer** selon §4. Par défaut, fournis le **source HTSL** dans un bloc de
   code ; si la personne veut « une page à ouvrir / envoyer / un fichier »,
   produis la **page HTML autonome** (§4.2) avec le template fourni.
5. **Vérifier** mentalement : chaque `{` a son `}` ; les attributs avec espaces
   sont entre guillemets ; les objets conteneurs ne contiennent que leurs
   enfants attendus (un `{@slider}` ne contient que des `{@slider.slide}`).

Des exemples complets prêts à adapter (cours, fiche d'exos, diaporama, document
imprimable, démo interactive) sont dans **`reference/recipes.md`**.

## 3. Les objets que tu utiliseras le plus

Catalogue exhaustif dans `reference/objects.md`. Les essentiels par intention :

**Maths** (alias courts) : `{@mti: …}` inline (≡ `$…$`), `{@mtb: …}` bloc
(≡ `$$…$$`), `{@mte[label=x]: …}` équation numérotée + `{@mtr[to=x]/}` renvoi,
`{@mta}` align, `{@mts}` système, `{@mtc}` cas, `{@mof}` fraction, `{@mom}`
matrice, `{@mov}` vecteur, `{@qty[value=, unit=]/}` grandeur physique,
`{@ce: …}` chimie (mhchem).

**Encadrés pédagogiques** (numérotés, renvoi via `{@ref[to=…]/}`) :
`{@theorem}` `{@definition}` `{@lemma}` `{@corollary}` `{@proposition}`
`{@property}` `{@example}` `{@proof}` `{@remark}` `{@warning}` `{@notation}`
`{@axiom}` … + `{@panel[color=,title=]}` (encadré neutre) et `{@badge}` inline.

**Pédagogie active** : `{@exercise[title=]}` (avec `{solution:…}` repliable),
`{@quiz}` (`{q}` + `{opt[correct=true]}`), `{@flashcard}` (`{front}`/`{back}`),
`{@reveal[title=]}` (spoiler), `{@stepper}`+`{@step}`, `{@checklist}`,
`{@deflist}` (glossaire), `{@timeline}`+`{@event}`.

**Mise en page** : `{@columns}`+`{@col}`, `{@tabs}`+`{@tabs.tab}`,
`{@callout…}`, `{@codeblock[lang=]}` (verbatim).

**Présentations & documents** : `{@slider[transition=,autoplay=]}` +
`{@slider.slide}` (diaporama) ; `{@document[numbers=true]}` + `{@document.page}`
(polycopié/livre imprimable PDF) ; `{@pdf[src=,page=]/}` (visionneuse).

**Visuel & données** : `{@plot[fn=,xrange=]}` (graphe de fonction, plusieurs
courbes via `{@plot.curve}`), `{@param[name=,min=,max=]/}` (curseur interactif
lié à un `{@plot}`), `{@chart[type=bar|pie|line|histogram]}`,
`{@variations}` / `{@signs}` (tableaux), `{@numberline}` (droite graduée),
`{@truthtable}` (table de vérité).

**Géométrie** : scène 2D `{@mg2.scene: {@mg2.frame…/} …acteurs}`
(point, circle, segment, polygon, droite, cpoint pour le plan complexe) ;
scène 3D math `{@mg3.scene: {@mg3.space…/} …}` (point, vector, plane, sphere…) ;
scène 3D animée WebGL `{@s3.scene: …}` (sphere, box, torus, surface z=f(x,y),
curve paramétrique, vector, line, label + animations `{@s3.animate}`).
Détails et règles (décor vs acteurs) dans `reference/syntax.md`.

## 4. Livrer le résultat

### 4.1 Source HTSL (défaut)

Donne le HTSL dans un bloc ` ```htsl ` indenté. La personne le colle dans le
**playground** (https://oscarmedra.github.io/htsl_engine/) ou tout éditeur
intégrant `@noah-medra/htsl-core`. Ne mets **jamais** de balises HTML autour du
HTSL dans ce mode.

### 4.2 Page HTML autonome (quand on veut un fichier à ouvrir / envoyer)

Copie `templates/standalone.html`, remplace le `<title>` et le contenu du
`<script type="text/htsl">`. La page charge le moteur + le runtime depuis le CDN
et fonctionne d'un double-clic (aucune installation). Points **non négociables**
pour que tout s'affiche :

- compiler **après `window.load`** et passer **`{ katex: window.katex }`** à
  `compile` (KaTeX est chargé en `defer`) ;
- injecter **`htsl_engine.mathCss`** dans un `<style>` (sinon encadrés, slides,
  numéros d'équation et tableaux ne sont pas stylés — le runtime ne le fait pas) ;
- charger **Plotly** si tu utilises `{@mg2/mg3/plot/chart}` ; **Three.js est
  chargé seul** par le runtime pour `{@s3}` ; **mhchem** si tu utilises `{@ce}` ;
- le runtime auto (`htsl.auto.global.js`, MutationObserver) hydrate ensuite les
  scènes, slides, quiz, onglets… tout seul.

Le template respecte déjà ces règles — pars de lui, ne réécris pas le `<script>`
d'amorçage de mémoire.

## 5. Sécurité & robustesse (ne jamais contourner)

- Tout texte et toute valeur d'attribut sont **échappés** (anti-XSS). Le HTSL ne
  produit jamais de JS exécutable : un `{script:…code…}` inline est rendu inerte.
  Pour du dynamisme, utilise les objets (`{@param}`, `{@quiz}`, scènes…), pas du
  JS injecté.
- Les attributs dont la valeur contient un espace, une virgule, `(` `)` ou du
  LaTeX **doivent** être entre guillemets : `center="(0,0)"`, `unit="m\cdot
  s^{-2}"`, `fn="sin(x)/x"`.
- Dans `{@codeblock}`, `{script}` et `{style}`, le corps est **verbatim** : ne
  pas échapper `{` `}` `\` à la main.
- En cas de doute sur un objet, son alias ou ses attributs : lis
  `reference/objects.md`. Ne jamais inventer d'objet ou d'attribut absent du
  catalogue.

## Fichiers de ce skill

| Fichier | Contenu |
|---------|---------|
| `reference/objects.md` | **Catalogue exhaustif** des 125 objets/éléments : chemin, alias, attributs, exemple. La source de vérité. |
| `reference/syntax.md` | Syntaxe approfondie : maths, géométrie (décor/acteurs, scènes 3D animées, timeline), composants `{!define}` & variables `{!set}`, conversion HTML→HTSL, pièges courants. |
| `reference/recipes.md` | Exemples complets prêts à adapter : cours, fiche d'exercices, diaporama, document imprimable, démo interactive. |
| `templates/standalone.html` | Gabarit de page HTML autonome (CDN + runtime + mathCss), à remplir. |
