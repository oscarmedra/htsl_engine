# HTSL — guide d'écriture (à coller en contexte)

> Colle **tout ce fichier** en tête de ta conversation (Claude Chat, API, autre
> modèle), puis fais ta demande (« crée un cours… », « un diaporama… », « un
> chapitre de roman… »). Ce guide est autonome : il contient la syntaxe, les objets,
> la méthode et les pièges. HTSL compile un balisage léger `{tag:contenu}` en HTML
> riche (formules KaTeX, encadrés, slides, quiz, scènes 2D/3D…). Il sert à TOUT :
> livres/romans, cours/manuels/rapports, diaporamas, pages interactives, fiches.

## 1. Syntaxe

```
{tag:contenu}             → <tag>contenu</tag>
{tag.classe#id:contenu}   → classes + id
{tag[a=1, b="val 2"]:…}   → attributs (valeur avec espace/virgule → guillemets)
{img[src="a.png"]/}       → élément auto-fermant (pas de contenu)
{@objet[attrs]:…} {@objet/}  → objet riche
{!-- commentaire --}      → aucune sortie
$formule$   $$formule$$    → maths inline / bloc (LaTeX)
\{ \} \: \$               → caractères littéraux
```

Deux familles : **éléments HTML** (sans `@` : `h1 h2 h3 p ul ol li table tr td th
strong em code a img figure blockquote hr div`) et **objets `@`** (tout le reste).

## 2. Choisis le format AVANT d'écrire

| Intention | Conteneur |
|---|---|
| roman, livre, cours/manuel/rapport, « à imprimer / PDF » | `{@document}` + `{@document.page}` |
| exposé, soutenance, slides, diaporama | `{@slider}` + `{@slider.slide}` |
| s'entraîner, réviser, page en ligne interactive | objets interactifs (quiz, reveal, tabs, param) |
| élément répété | composant `{!define}` |

En cas de doute, demande avant de produire un long contenu.

## 3. Objets essentiels (cheat-sheet)

**Maths** : `{@mti: …}` inline (≡ `$…$`) · `{@mtb: …}` bloc (≡ `$$…$$`) ·
`{@mte[label=x]: …}` équation numérotée + `{@mtr[to=x]/}` renvoi d'équation ·
`{@mta}` aligné (`{line: a &= b}`) · `{@mts}` système · `{@mtc[intro=]}` cas ·
`{@mof:{num:1}{den:2}}` fraction · `{@mom:{row:1,2}{row:3,4}}` matrice ·
`{@mov:{c:1}{c:2}}` vecteur · `{@qty[value=9.81, unit="m\cdot s^{-2}"]/}` grandeur ·
`{@ce: 2H2 + O2 -> 2H2O}` chimie · constantes `{@mc.pi/}` `{@mc.e/}` `{@mc.inf/}`.

**Encadrés (numérotés, renvoi `{@ref[to=label]/}`)** : `{@theorem}` `{@definition}`
`{@lemma}` `{@corollary}` `{@proposition}` `{@property}` `{@example}` `{@proof}`
`{@remark}` `{@warning}` `{@notation}` `{@axiom}` `{@algorithm}`. Attributs
`title`, `label`. Encadré neutre : `{@panel[color=indigo, title="…"]: …}`.
Étiquette inline : `{@badge[color=green]: Nouveau}`.

**Pédagogie** : `{@exercise[title=]: … {solution: …}}` · `{@quiz: {q:…}
{opt[correct=true]:…} {opt:…} {explain:…}}` · `{@flashcard: {front:…} {back:…}}` ·
`{@reveal[title="Solution"]: …}` · `{@stepper: {@step[title=]: …}}` ·
`{@checklist: {item[checked=true]:…} {item:…}}` · `{@deflist: {term:…} {def:…}}` ·
`{@timeline: {@event[date="1905"]: …}}`.

**Mise en page** : `{@columns: {@col:…} {@col:…}}` · `{@tabs: {@tabs.tab[title=]:…}}` ·
`{@codeblock[lang=python]: …}` (contenu VERBATIM, n'échappe pas) · `{ol[type=alpha|
Alpha|roman|Roman|paren]}`.

**Document / slides** : `{@document[numbers=true, header="…", footer="…"]: {@document.page:
…}}` (chaque page = une feuille à l'impression ; le trop-plein coule tout seul) ·
`{@slider[transition=fade, loop=true]: {@slider.slide: …}}`.

**Données / visuel** : `{@plot[fn="sin(x)/x", xrange="(-15,15)", title="…"]/}`
(plusieurs courbes : `{@plot: {@plot.curve[fn="sin(x)", label="sin"]/} …}`) ·
`{@param[name="a", min=-3, max=3, step=0.1, value=1]/}` (curseur lié à un `{@plot}`) ·
`{@chart[type=bar|pie|line|histogram]: {pt[x="Lun", y=12]/}}` ·
`{@variations[var="x", fn="f(x)"]: {pt[x="-\\infty", y="+\\infty"]/} {down/} …}` ·
`{@signs[var="x", fn="x-2"]: {pt[x="-\\infty"]/} {s: -} {pt[x="2", zero=true]/} …}` ·
`{@numberline[from=-3, to=3]: {point[x=-1, name=A]/}}` · `{@truthtable: {head: p, q}
{row: V, F}}`.

**Géométrie** : scène 2D `{@mg2.scene: {@mg2.frame[xrange="(-4,4)", grid=true,
equal=true]/} {@mg2.circle[center="(0,0)", radius=2]/} {@mg2.point[x=1, y=2, name=A]/}}`
(aussi `segment`, `polygon`, `droite`, `cpoint` pour le plan complexe) · scène 3D math
`{@mg3.scene: {@mg3.space/} {@mg3.sphere[center="(0,0,0)", radius=2]/}}` (aussi `point`,
`vector`, `plane`, `segment`, `line`) · scène 3D animée `{@s3.scene[controls=true]:
{@s3.sphere[radius=0.7, glow=true]/} {@s3.surface[z="sin(x)*cos(y)", xrange="(-3,3)",
yrange="(-3,3)"]/} {@s3.animate[target="A", action="move", to="(2,2,0)", duration=2]/}}`.

## 4. Composants & variables

```
{!define carte[titre, color=indigo]:
  {@panel[color=indigo, title="{$titre}"]: {$children}}
}
{@carte[titre="Bonjour"]: contenu dans children}

{!set thm: "\tfrac12(p^2+\omega^2 q^2)"}   {!-- valeur entre guillemets = LaTeX brut --}
{@mtb: H = {$thm}}
```
`{$children}` = contenu passé à l'usage (uniquement dans un corps de composant).

## 5. Méthode & pièges

- Écris les contenus longs **par morceaux** (chapitre/section/groupe de slides),
  chacun relu, puis assemble. Factorise le répété en `{!define}`.
- **Numérotation globale** : renvoie à un encadré par son **label** (`{@ref[to=…]/}`),
  pas « voir le théorème 3 ».
- `{@mtr}` renvoie à une **équation** `{@mte}` ; `{@ref}` renvoie à un **encadré**.
  Ne les confonds pas.
- N'utilise **que des objets qui existent** (ceux de ce guide). Un tableau HTML = `{table}`,
  pas `{@table}`.
- Attribut avec espace / virgule / parenthèses / LaTeX → **guillemets doubles** :
  `center="(0,0)"`, `unit="m\cdot s^{-2}"`, `fn="sin(x)/x"`. Une apostrophe dans une
  valeur → guillemets doubles (`title="l'eau"`).
- Dans un roman : pas d'objets pédagogiques (théorèmes, quiz…), seulement titres de
  chapitres, épigraphes `{blockquote}`, séparateurs `{hr/}`. Typo française : `«  »`,
  apostrophe `’`, espace insécable avant `; : ! ?`.
- Pour l'impression (`{@document}`) : rien d'interactif → mets les corrigés en texte
  statique. Un diaporama : une idée par slide, peu de texte.

## 6. Livrer

- **Source HTSL** dans un bloc ```htsl (à coller dans le playground
  https://oscarmedra.github.io/htsl_engine/).
- **Page HTML autonome** : charge le moteur + KaTeX, injecte `htsl_engine.mathCss`,
  compile après `window.load` avec `{ katex: window.katex }`. Pour un `{@slider}`,
  utilise le bundle **non-auto** `htsl.global.js` et appelle `htsl_engine.hydrate(out)`
  **une seule fois** (le bundle auto peut boucler avec un slider).

```html
<script src="https://unpkg.com/@noah-medra/htsl-core/dist-min/htsl.global.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<div id="out"></div>
<script>
  window.addEventListener("load", function () {
    document.head.appendChild(Object.assign(document.createElement("style"),
      { textContent: htsl_engine.mathCss }));
    var out = document.getElementById("out");
    out.innerHTML = htsl_engine.compile(MON_SOURCE_HTSL, { katex: window.katex, prettyPrint: true });
    htsl_engine.hydrate(out);
  });
</script>
```

---
*Fin du guide. Produis du HTSL propre et indenté ; en cas de doute sur un objet, n'en
invente pas — reste à ceux listés ci-dessus.*
