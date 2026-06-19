/**
 * Object registry with introspection metadata.
 *
 * Objects are declared via {@link registerObject} with: a canonical path, a
 * content model, flat aliases, a short description, an attribute schema and a
 * usage example. The lexer/renderer consult `resolvePath`, `contentModelOf` and
 * `isKnownObject`; tooling (the playground) consults `listObjects` /
 * `describeObject`.
 *
 * Content models:
 *   - "math": content is raw LaTeX text plus nested `{@...}` objects
 *   - "html": content is ordinary HTSL nodes (e.g. `{line:...}`, `{num:...}`)
 *   - "void": self-closing only, no content
 */

export type ContentModel = "math" | "html" | "void";

export type AttrType =
  | "number"
  | "string"
  | "boolean"
  | "color"
  | "tuple"
  | "complex"
  | "points"
  | "enum";

export interface AttrSchema {
  name: string;
  type: AttrType;
  required: boolean;
  default?: string;
  description: string;
  /** Allowed values for an "enum" type. */
  values?: string[];
}

/** Authoring category, used to group entries in the insertion palette. */
export type Category = "structure" | "formules" | "géométrie" | "document";

/** What syntax an entry uses: an `@`-object or a plain HTML element. */
export type EntryKind = "object" | "element";

export interface ObjectMeta {
  path: string;
  kind: EntryKind;
  contentModel: ContentModel;
  category: Category;
  aliases: string[];
  description: string;
  attrs: AttrSchema[];
  /** Insertion template with CodeMirror hole markers, e.g. `{@mti: ${1:formule}}`. */
  snippet: string;
  example: string;
}

export interface RegistryEntry {
  path: string;
  aliases: string[];
  kind: EntryKind;
  category: Category;
  description: string;
  snippet: string;
  example: string;
}

/** Collection-prefix aliases: first dotted segment is expanded. */
const COLLECTION_ALIASES: Record<string, string> = {
  mt: "math.text",
  mc: "math.constant",
  mo: "math.object",
  mg2: "math.geometry.2d",
  mg3: "math.geometry.3d",
  s3: "scene.3d",
  plot: "math.plot",
};

const OBJECTS = new Map<string, ObjectMeta>();
const ALIAS_TO_PATH = new Map<string, string>();

/** Compute the short collection-aliased form of a path (e.g. mg2.frame). */
function collectionAliasOf(path: string): string | null {
  let best: { key: string; value: string } | null = null;
  for (const [key, value] of Object.entries(COLLECTION_ALIASES)) {
    if (path === value || path.startsWith(value + ".")) {
      if (!best || value.length > best.value.length) best = { key, value };
    }
  }
  if (!best) return null;
  return best.key + path.slice(best.value.length);
}

export function registerObject(
  meta: Omit<ObjectMeta, "aliases" | "kind" | "contentModel"> & {
    aliases?: string[];
    kind?: EntryKind;
    contentModel?: ContentModel;
  },
): void {
  const flat = meta.aliases ?? [];
  const collection = collectionAliasOf(meta.path);
  const aliases = [...flat];
  if (collection && !aliases.includes(collection)) aliases.push(collection);

  const full: ObjectMeta = {
    ...meta,
    kind: meta.kind ?? "object",
    contentModel: meta.contentModel ?? "html",
    aliases,
  };
  OBJECTS.set(meta.path, full);
  for (const a of flat) ALIAS_TO_PATH.set(a, meta.path);
}

/* -------------------------------------------------------------------------- */
/* Resolution (used by the lexer / renderer)                                  */
/* -------------------------------------------------------------------------- */

export function resolvePath(raw: string): string {
  const flat = ALIAS_TO_PATH.get(raw);
  if (flat) return flat;

  const dot = raw.indexOf(".");
  if (dot > 0) {
    const head = raw.slice(0, dot);
    const expanded = COLLECTION_ALIASES[head];
    if (expanded) return expanded + raw.slice(dot);
  }
  return raw;
}

/** True only for `@`-objects (HTML element entries don't affect the language). */
export function isKnownObject(raw: string): boolean {
  return OBJECTS.get(resolvePath(raw))?.kind === "object";
}

export function contentModelOf(raw: string): ContentModel {
  const m = OBJECTS.get(resolvePath(raw));
  return m && m.kind === "object" ? m.contentModel : "html";
}

/* -------------------------------------------------------------------------- */
/* Introspection                                                              */
/* -------------------------------------------------------------------------- */

export function listObjects(): RegistryEntry[] {
  return [...OBJECTS.values()]
    .map((m) => ({
      path: m.path,
      aliases: m.aliases,
      kind: m.kind,
      category: m.category,
      description: m.description,
      snippet: m.snippet,
      example: m.example,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function describeObject(pathOrAlias: string): ObjectMeta | null {
  return OBJECTS.get(resolvePath(pathOrAlias)) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Attribute-schema helpers                                                   */
/* -------------------------------------------------------------------------- */

const COLOR: AttrSchema = { name: "color", type: "color", required: false, description: "Couleur de l'objet." };
const OPACITY: AttrSchema = { name: "opacity", type: "number", required: false, description: "Opacité (0–1)." };
const NAME: AttrSchema = { name: "name", type: "string", required: false, description: "Étiquette affichée." };

function tuple(name: string, required: boolean, description: string): AttrSchema {
  return { name, type: "tuple", required, description };
}
function bool(name: string, def: string, description: string): AttrSchema {
  return { name, type: "boolean", required: false, default: def, description };
}

/* -------------------------------------------------------------------------- */
/* Registrations                                                              */
/* -------------------------------------------------------------------------- */

// --- math.text ---
registerObject({
  path: "math.text.inline",
  contentModel: "math",
  category: "formules",
  aliases: ["mti"],
  description: "Formule LaTeX dans le flux du texte.",
  attrs: [],
  snippet: "{@mti: ${1:formule}}",
  example: "{@mti: x^2 + 1}",
});
registerObject({
  path: "math.text.block",
  contentModel: "math",
  category: "formules",
  aliases: ["mtb"],
  description: "Formule centrée sur sa propre ligne.",
  attrs: [],
  snippet: "{@mtb: ${1:formule}}",
  example: "{@mtb: \\int_0^1 x^2 \\, dx}",
});
registerObject({
  path: "math.text.equation",
  contentModel: "math",
  category: "document",
  aliases: ["mte"],
  description: "Équation numérotée automatiquement.",
  attrs: [{ name: "label", type: "string", required: false, description: "Étiquette pour les références croisées." }],
  snippet: "{@mte[label=${1:eq1}]: ${2:E = mc^2}}",
  example: "{@mte[label=eq1]: E = mc^2}",
});
registerObject({
  path: "math.text.ref",
  contentModel: "void",
  category: "document",
  aliases: ["mtr"],
  description: "Référence croisée vers une équation numérotée.",
  attrs: [{ name: "to", type: "string", required: true, description: "Label de l'équation cible." }],
  snippet: "{@mtr[to=${1:eq1}]/}",
  example: "{@mte[label=eq1]: E = mc^2}{p:voir l'équation {@mtr[to=eq1]/}}",
});
registerObject({
  path: "math.text.align",
  contentModel: "html",
  category: "formules",
  aliases: ["mta"],
  description: "Équations alignées (enfants {line: ...}).",
  attrs: [],
  snippet: "{@mta:\n  {line: ${1:f(x) &= x^2}}\n  {line: ${2:&= x \\cdot x}}\n}",
  example: "{@mta:\n  {line: f(x) &= x^2}\n  {line: &= x \\cdot x}\n}",
});
registerObject({
  path: "math.text.cases",
  contentModel: "html",
  category: "formules",
  aliases: ["mtc"],
  description: "Définition par cas (enfants {case: ...}).",
  attrs: [{ name: "intro", type: "string", required: false, description: "Membre de gauche (ex. |x|)." }],
  snippet: "{@mtc[intro=${1:\"|x|\"}]:\n  {case: ${2:x & x \\geq 0}}\n  {case: ${3:-x & x < 0}}\n}",
  example: "{@mtc[intro=\"|x|\"]:\n  {case: x & \\text{si } x \\geq 0}\n  {case: -x & \\text{si } x < 0}\n}",
});
registerObject({
  path: "math.text.system",
  contentModel: "html",
  category: "formules",
  aliases: ["mts"],
  description: "Système d'équations avec accolade (enfants {line: ...}).",
  attrs: [],
  snippet: "{@mts:\n  {line: ${1:2x + y = 5}}\n  {line: ${2:x - y = 1}}\n}",
  example: "{@mts:\n  {line: 2x + y = 5}\n  {line: x - y = 1}\n}",
});

// --- math.object / math.constant ---
registerObject({
  path: "math.object.fraction",
  contentModel: "html",
  category: "formules",
  aliases: ["mof"],
  description: "Fraction \\frac{}{} (enfants {num:...} et {den:...}).",
  attrs: [],
  snippet: "{@mof:{num:${1:1}}{den:${2:2}}}",
  example: "{@mof:{num:1}{den:2}}",
});
registerObject({
  path: "math.object.vector",
  contentModel: "html",
  category: "formules",
  aliases: ["mov"],
  description: "Vecteur colonne (un enfant {c:...} par composante).",
  attrs: [],
  snippet: "{@mov:{c:${1:1}}{c:${2:2}}{c:${3:3}}}",
  example: "{@mov:{c:1}{c:2}{c:3}}",
});
registerObject({
  path: "math.object.matrix",
  contentModel: "html",
  category: "formules",
  aliases: ["mom"],
  description: "Matrice (un enfant {row:a,b,…} par ligne, colonnes séparées par des virgules).",
  attrs: [],
  snippet: "{@mom:{row:${1:1,2}}{row:${2:3,4}}}",
  example: "{@mom:{row:1,2}{row:3,4}}",
});
registerObject({
  path: "math.object.complex",
  contentModel: "void",
  category: "formules",
  aliases: ["moc"],
  description: "Nombre complexe a + bi (attributs re, im).",
  attrs: [
    { name: "re", type: "number", required: false, default: "0", description: "Partie réelle." },
    { name: "im", type: "number", required: false, default: "0", description: "Partie imaginaire." },
  ],
  snippet: "{@moc[re=${1:3}, im=${2:2}]/}",
  example: "{@moc[re=3, im=2]/}",
});
registerObject({
  path: "math.object.set",
  contentModel: "math",
  category: "formules",
  aliases: ["mos"],
  description: "Ensemble { … } (le corps en est le contenu).",
  attrs: [],
  snippet: "{@mos: ${1:1, 2, 3}}",
  example: "{@mos: 1, 2, 3}",
});
registerObject({
  path: "math.object.interval",
  contentModel: "void",
  category: "formules",
  aliases: ["moi"],
  description: "Intervalle (attributs from, to, open = none|left|right|both).",
  attrs: [
    { name: "from", type: "number", required: false, description: "Borne inférieure." },
    { name: "to", type: "number", required: false, description: "Borne supérieure." },
    {
      name: "open",
      type: "enum",
      required: false,
      default: "none",
      values: ["none", "left", "right", "both"],
      description: "Borne(s) ouverte(s).",
    },
  ],
  snippet: "{@moi[from=${1:0}, to=${2:1}, open=${3:\"right\"}]/}",
  example: "{@moi[from=0, to=1, open=\"right\"]/}",
});
registerObject({
  path: "math.constant.pi",
  contentModel: "void",
  category: "formules",
  aliases: [],
  description: "Constante π.",
  attrs: [],
  snippet: "{@mc.pi/}",
  example: "{@mc.pi/}",
});
registerObject({
  path: "math.constant.e",
  contentModel: "void",
  category: "formules",
  aliases: [],
  description: "Constante e (Euler).",
  attrs: [],
  snippet: "{@mc.e/}",
  example: "{@mc.e/}",
});
registerObject({
  path: "math.constant.inf",
  contentModel: "void",
  category: "formules",
  aliases: [],
  description: "Infini ∞.",
  attrs: [],
  snippet: "{@mc.inf/}",
  example: "{@mc.inf/}",
});
registerObject({
  path: "math.constant.phi",
  contentModel: "void",
  category: "formules",
  aliases: [],
  description: "Nombre d'or φ.",
  attrs: [],
  snippet: "{@mc.phi/}",
  example: "{@mc.phi/}",
});
registerObject({
  path: "math.constant.i",
  contentModel: "void",
  category: "formules",
  aliases: [],
  description: "Unité imaginaire i.",
  attrs: [],
  snippet: "{@mc.i/}",
  example: "{@mc.i/}",
});

// --- 2D geometry ---
registerObject({
  path: "math.geometry.2d.scene",
  contentModel: "html",
  category: "géométrie",
  aliases: [],
  description: "Scène géométrique 2D (conteneur rendu via Plotly).",
  attrs: [
    { name: "width", type: "number", required: false, default: "600", description: "Largeur en pixels." },
    { name: "height", type: "number", required: false, default: "400", description: "Hauteur en pixels." },
  ],
  snippet:
    "{@mg2.scene:\n  {@mg2.frame[grid=true]/}\n  {@mg2.circle[center=\"(0,0)\", radius=2]/}\n  {@mg2.point[x=0, y=0, name=O]/}\n  ${1}\n}",
  example: "{@mg2.scene:\n  {@mg2.frame[grid=true]/}\n  {@mg2.circle[center=\"(0,0)\", radius=2]/}\n}",
});
registerObject({
  path: "math.geometry.2d.frame",
  contentModel: "void",
  category: "géométrie",
  aliases: ["repere"],
  description: "Décor : repère cartésien 2D (ou plan complexe avec type=complex).",
  attrs: [
    tuple("xrange", false, "Intervalle des abscisses, ex. (-4,4)."),
    tuple("yrange", false, "Intervalle des ordonnées."),
    bool("grid", "true", "Affiche la grille."),
    { name: "ticks", type: "number", required: false, description: "Pas des graduations." },
    bool("equal", "true", "Repère orthonormé (un cercle reste rond)."),
    bool("axes", "true", "Affiche les axes."),
    { name: "labels", type: "string", required: false, default: "x,y", description: "Étiquettes des axes." },
    { name: "type", type: "enum", required: false, values: ["cartesian", "complex"], description: "Type de repère." },
    { name: "range", type: "number", required: false, description: "Demi-étendue (plan complexe)." },
    bool("unitcircle", "false", "Trace le cercle unité (plan complexe)."),
  ],
  snippet: "{@mg2.frame[xrange=${1:\"(-4,4)\"}, yrange=${2:\"(-3,3)\"}, grid=true]/}",
  example: "{@mg2.frame[xrange=\"(-4,4)\", yrange=\"(-3,3)\", grid=true, ticks=1]/}",
});
registerObject({
  path: "math.geometry.2d.point",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Point 2D.",
  attrs: [
    { name: "x", type: "number", required: true, description: "Abscisse." },
    { name: "y", type: "number", required: true, description: "Ordonnée." },
    NAME,
    COLOR,
  ],
  snippet: "{@mg2.point[x=${1:0}, y=${2:0}, name=${3:A}]/}",
  example: "{@mg2.point[x=1, y=2, name=A]/}",
});
registerObject({
  path: "math.geometry.2d.cpoint",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Point d'affixe complexe (a+bi).",
  attrs: [
    { name: "z", type: "complex", required: true, description: "Affixe, ex. 3+2i, -1-2i, i." },
    NAME,
    COLOR,
  ],
  snippet: "{@mg2.cpoint[z=${1:\"3+2i\"}, name=${2:A}]/}",
  example: "{@mg2.cpoint[z=\"3+2i\", name=A]/}",
});
registerObject({
  path: "math.geometry.2d.segment",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Segment 2D entre deux points.",
  attrs: [tuple("from", true, "Première extrémité, ex. (0,0)."), tuple("to", true, "Seconde extrémité."), COLOR],
  snippet: "{@mg2.segment[from=${1:\"(0,0)\"}, to=${2:\"(3,4)\"}]/}",
  example: "{@mg2.segment[from=\"(0,0)\", to=\"(3,4)\"]/}",
});
registerObject({
  path: "math.geometry.2d.circle",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Cercle 2D.",
  attrs: [tuple("center", false, "Centre, ex. (0,0)."), { name: "radius", type: "number", required: false, default: "1", description: "Rayon." }, COLOR, OPACITY],
  snippet: "{@mg2.circle[center=${1:\"(0,0)\"}, radius=${2:2}]/}",
  example: "{@mg2.circle[center=\"(0,0)\", radius=2]/}",
});
registerObject({
  path: "math.geometry.2d.polygon",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Polygone 2D rempli.",
  attrs: [{ name: "points", type: "points", required: true, description: "Sommets séparés par ;, ex. (0,0);(2,0);(1,2)." }, COLOR, OPACITY],
  snippet: "{@mg2.polygon[points=${1:\"(-2,-2);(2,-2);(0,3)\"}]/}",
  example: "{@mg2.polygon[points=\"(-2,-2);(2,-2);(0,3)\"]/}",
});
registerObject({
  path: "math.geometry.2d.droite",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Droite 2D (point + direction).",
  attrs: [tuple("point", false, "Point de passage."), tuple("dir", false, "Vecteur directeur, ex. (1,1)."), COLOR],
  snippet: "{@mg2.droite[point=${1:\"(0,0)\"}, dir=${2:\"(1,1)\"}]/}",
  example: "{@mg2.droite[point=\"(0,0)\", dir=\"(1,1)\"]/}",
});

// --- 3D geometry ---
registerObject({
  path: "math.geometry.3d.scene",
  contentModel: "html",
  category: "géométrie",
  aliases: [],
  description: "Scène géométrique 3D (conteneur rendu via Plotly).",
  attrs: [
    { name: "width", type: "number", required: false, default: "600", description: "Largeur en pixels." },
    { name: "height", type: "number", required: false, default: "400", description: "Hauteur en pixels." },
  ],
  snippet:
    "{@mg3.scene:\n  {@mg3.space[grid=true]/}\n  {@mg3.sphere[center=\"(0,0,0)\", radius=2]/}\n  ${1}\n}",
  example: "{@mg3.scene:\n  {@mg3.space[grid=true]/}\n  {@mg3.sphere[center=\"(0,0,0)\", radius=2]/}\n}",
});
registerObject({
  path: "math.geometry.3d.space",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Décor : repère 3D.",
  attrs: [
    tuple("xrange", false, "Intervalle x."),
    tuple("yrange", false, "Intervalle y."),
    tuple("zrange", false, "Intervalle z."),
    bool("grid", "true", "Affiche la grille."),
    { name: "ticks", type: "number", required: false, description: "Pas des graduations." },
    bool("equal", "true", "Aspect orthonormé."),
    { name: "labels", type: "string", required: false, default: "x,y,z", description: "Étiquettes des axes." },
  ],
  snippet: "{@mg3.space[xrange=${1:\"(-5,5)\"}, grid=true, ticks=${2:2}]/}",
  example: "{@mg3.space[xrange=\"(-5,5)\", grid=true, ticks=2]/}",
});
registerObject({
  path: "math.geometry.3d.point",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Point 3D.",
  attrs: [
    { name: "x", type: "number", required: true, description: "Abscisse." },
    { name: "y", type: "number", required: true, description: "Ordonnée." },
    { name: "z", type: "number", required: true, description: "Cote." },
    NAME,
    COLOR,
  ],
  snippet: "{@mg3.point[x=${1:1}, y=${2:2}, z=${3:3}, name=${4:A}]/}",
  example: "{@mg3.point[x=1, y=2, z=3, name=A]/}",
});
registerObject({
  path: "math.geometry.3d.vector",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Vecteur 3D (flèche avec cône).",
  attrs: [tuple("from", true, "Origine, ex. (1,2,3)."), tuple("to", true, "Extrémité."), COLOR],
  snippet: "{@mg3.vector[from=${1:\"(0,0,0)\"}, to=${2:\"(1,1,1)\"}]/}",
  example: "{@mg3.vector[from=\"(1,2,3)\", to=\"(1,3,4)\"]/}",
});
registerObject({
  path: "math.geometry.3d.segment",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Segment 3D entre deux points.",
  attrs: [tuple("from", true, "Première extrémité."), tuple("to", true, "Seconde extrémité."), COLOR],
  snippet: "{@mg3.segment[from=${1:\"(0,0,0)\"}, to=${2:\"(1,1,1)\"}]/}",
  example: "{@mg3.segment[from=\"(-2,-2,-2)\", to=\"(2,2,2)\"]/}",
});
registerObject({
  path: "math.geometry.3d.line",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Droite 3D (point + direction).",
  attrs: [tuple("point", false, "Point de passage."), tuple("dir", false, "Vecteur directeur."), COLOR],
  snippet: "{@mg3.line[point=${1:\"(0,0,0)\"}, dir=${2:\"(1,0,0)\"}]/}",
  example: "{@mg3.line[point=\"(0,0,0)\", dir=\"(1,0,0)\"]/}",
});
registerObject({
  path: "math.geometry.3d.plane",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Plan 3D (équation normale·X = d), rendu en surface.",
  attrs: [tuple("normal", true, "Vecteur normal, ex. (2,-1,3)."), { name: "d", type: "number", required: false, default: "0", description: "Terme constant." }, COLOR, OPACITY],
  snippet: "{@mg3.plane[normal=${1:\"(2,-1,3)\"}, d=${2:5}, opacity=0.5]/}",
  example: "{@mg3.plane[normal=\"(2,-1,3)\", d=5, opacity=0.5]/}",
});
registerObject({
  path: "math.geometry.3d.sphere",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Sphère 3D (surface paramétrique).",
  attrs: [tuple("center", false, "Centre, ex. (0,0,0)."), { name: "radius", type: "number", required: false, default: "1", description: "Rayon." }, COLOR, OPACITY],
  snippet: "{@mg3.sphere[center=${1:\"(0,0,0)\"}, radius=${2:2}]/}",
  example: "{@mg3.sphere[center=\"(0,0,0)\", radius=2]/}",
});

// --- 2D function plot (y = f(x), rendered via Plotly) ---
registerObject({
  path: "math.plot.fn",
  contentModel: "html",
  category: "géométrie",
  aliases: ["plot"],
  description: "Graphe de fonction(s) y = f(x). Une seule (attr fn) ou plusieurs ({@plot.curve}).",
  attrs: [
    { name: "fn", type: "string", required: false, description: "Expression y=f(x) (forme à une courbe)." },
    tuple("xrange", false, "Intervalle x, ex. (-10,10)."),
    { name: "samples", type: "number", required: false, default: "400", description: "Nombre de points." },
    { name: "title", type: "string", required: false, description: "Titre du graphe." },
    COLOR,
    { name: "width", type: "number", required: false, default: "640", description: "Largeur en pixels." },
    { name: "height", type: "number", required: false, default: "360", description: "Hauteur en pixels." },
  ],
  snippet:
    "{@plot[xrange=\"(-6.28,6.28)\", title=${1:\"Trigonométrie\"}]:\n  {@plot.curve[fn=\"sin(x)\", label=\"sin\"]/}\n  {@plot.curve[fn=\"cos(x)\", label=\"cos\"]/}\n}",
  example: "{@plot[fn=\"sin(x)/x\", xrange=\"(-15,15)\", title=\"y = sin(x)/x\"]/}",
});
registerObject({
  path: "math.plot.curve",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Une courbe y = f(x) dans un {@plot} (pour superposer plusieurs fonctions).",
  attrs: [
    { name: "fn", type: "string", required: false, default: "x", description: "Expression y=f(x)." },
    { name: "label", type: "string", required: false, description: "Nom dans la légende." },
    COLOR,
  ],
  snippet: "{@plot.curve[fn=${1:\"sin(x)\"}, label=${2:\"sin\"}]/}",
  example: "{@plot.curve[fn=\"sin(x)\", label=\"sin\"]/}",
});

// --- Declarative animated 3D scenes (WebGL / Three.js) ---
const SPIN: AttrSchema = { name: "spin", type: "number", required: false, default: "0", description: "Rotation propre par image." };
const ORBIT: AttrSchema = { name: "orbit", type: "number", required: false, default: "0", description: "Rayon d'orbite autour de l'origine." };
const SPEED: AttrSchema = { name: "speed", type: "number", required: false, default: "0", description: "Vitesse angulaire de l'orbite." };
const GLOW: AttrSchema = { name: "glow", type: "boolean", required: false, default: "false", description: "Matériau auto-lumineux (ex. soleil)." };
const POS3: AttrSchema[] = [
  { name: "x", type: "number", required: false, default: "0", description: "Position x." },
  { name: "y", type: "number", required: false, default: "0", description: "Position y." },
  { name: "z", type: "number", required: false, default: "0", description: "Position z." },
];
const LABEL: AttrSchema = { name: "label", type: "string", required: false, description: "Étiquette affichée près de l'objet." };
const ID: AttrSchema = { name: "id", type: "string", required: false, description: "Identifiant (cible des animations {@s3.animate})." };
/** Common motion/material attributes shared by 3D meshes. */
const MOTION: AttrSchema[] = [ID, ...POS3, COLOR, OPACITY, SPIN, ORBIT, SPEED, GLOW, LABEL];
registerObject({
  path: "scene.3d.scene",
  contentModel: "html",
  category: "géométrie",
  aliases: [],
  description: "Scène 3D animée (WebGL, rendue via Three.js).",
  attrs: [
    { name: "width", type: "number", required: false, default: "600", description: "Largeur en pixels." },
    { name: "height", type: "number", required: false, default: "400", description: "Hauteur en pixels." },
    { name: "background", type: "string", required: false, default: "#020617", description: "Couleur de fond." },
    { name: "distance", type: "number", required: false, default: "6", description: "Distance de la caméra." },
    { name: "controls", type: "boolean", required: false, default: "false", description: "Rotation à la souris (OrbitControls)." },
    { name: "autorotate", type: "boolean", required: false, default: "false", description: "Rotation automatique lente." },
  ],
  snippet:
    "{@s3.scene[height=480]:\n  {@s3.sphere[radius=0.8, color=\"#facc15\", glow=true, spin=0.003]/}\n  {@s3.sphere[radius=0.3, color=\"#60a5fa\", orbit=3, speed=0.02]/}\n  ${1}\n}",
  example:
    "{@s3.scene[height=480]:\n  {@s3.sphere[radius=0.8, color=\"#facc15\", glow=true, spin=0.003]/}\n  {@s3.sphere[radius=0.3, color=\"#60a5fa\", orbit=3, speed=0.02]/}\n}",
});
registerObject({
  path: "scene.3d.sphere",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Sphère 3D (WebGL) : position, couleur, rotation, orbite.",
  attrs: [
    ID,
    { name: "radius", type: "number", required: false, default: "0.5", description: "Rayon." },
    ...POS3,
    COLOR,
    SPIN,
    ORBIT,
    SPEED,
    GLOW,
    LABEL,
  ],
  snippet: "{@s3.sphere[radius=${1:0.5}, color=${2:\"#60a5fa\"}, orbit=${3:3}, speed=${4:0.02}]/}",
  example: "{@s3.sphere[radius=0.4, color=\"#60a5fa\", orbit=3, speed=0.02]/}",
});
registerObject({
  path: "scene.3d.box",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Cube/boîte 3D (WebGL) : position, couleur, rotation, orbite.",
  attrs: [
    ID,
    { name: "size", type: "number", required: false, default: "1", description: "Côté." },
    ...POS3,
    COLOR,
    SPIN,
    ORBIT,
    SPEED,
    GLOW,
    LABEL,
  ],
  snippet: "{@s3.box[size=${1:1}, color=${2:\"#f472b6\"}, spin=${3:0.01}]/}",
  example: "{@s3.box[size=1, color=\"#f472b6\", spin=0.01]/}",
});
registerObject({
  path: "scene.3d.torus",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Tore (donut) 3D : rayon + rayon du tube.",
  attrs: [
    { name: "radius", type: "number", required: false, default: "1", description: "Rayon principal." },
    { name: "tube", type: "number", required: false, default: "0.3", description: "Rayon du tube." },
    ...MOTION,
  ],
  snippet: "{@s3.torus[radius=${1:1}, tube=${2:0.3}, color=${3:\"#34d399\"}, spin=0.01]/}",
  example: "{@s3.torus[radius=1, tube=0.3, color=\"#34d399\", spin=0.01]/}",
});
registerObject({
  path: "scene.3d.cylinder",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Cylindre 3D : rayon + hauteur.",
  attrs: [
    { name: "radius", type: "number", required: false, default: "0.5", description: "Rayon." },
    { name: "height", type: "number", required: false, default: "1", description: "Hauteur." },
    ...MOTION,
  ],
  snippet: "{@s3.cylinder[radius=${1:0.5}, height=${2:1.5}, color=${3:\"#a78bfa\"}]/}",
  example: "{@s3.cylinder[radius=0.5, height=1.5, color=\"#a78bfa\"]/}",
});
registerObject({
  path: "scene.3d.cone",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Cône 3D : rayon de base + hauteur.",
  attrs: [
    { name: "radius", type: "number", required: false, default: "0.5", description: "Rayon de base." },
    { name: "height", type: "number", required: false, default: "1", description: "Hauteur." },
    ...MOTION,
  ],
  snippet: "{@s3.cone[radius=${1:0.5}, height=${2:1.5}, color=${3:\"#fb923c\"}]/}",
  example: "{@s3.cone[radius=0.6, height=1.5, color=\"#fb923c\"]/}",
});
registerObject({
  path: "scene.3d.plane",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Plan 3D (carré, horizontal par défaut).",
  attrs: [
    { name: "size", type: "number", required: false, default: "6", description: "Côté du plan." },
    ...MOTION,
  ],
  snippet: "{@s3.plane[size=${1:6}, color=${2:\"#1e293b\"}, opacity=0.6]/}",
  example: "{@s3.plane[size=6, color=\"#1e293b\", opacity=0.6]/}",
});
registerObject({
  path: "scene.3d.point",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Point 3D (petit marqueur) ; orbit = trajectoire animée.",
  attrs: [
    { name: "radius", type: "number", required: false, default: "0.12", description: "Taille du marqueur." },
    ...MOTION,
  ],
  snippet: "{@s3.point[x=${1:1}, y=${2:1}, z=${3:1}, color=${4:\"#f87171\"}, label=${5:\"A\"}]/}",
  example: "{@s3.point[x=1, y=1, z=1, color=\"#f87171\", label=\"A\"]/}",
});
registerObject({
  path: "scene.3d.label",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Étiquette texte 3D (billboard, toujours face caméra).",
  attrs: [
    { name: "text", type: "string", required: false, description: "Texte affiché." },
    ...POS3,
    COLOR,
    { name: "size", type: "number", required: false, default: "0.4", description: "Taille." },
  ],
  snippet: "{@s3.label[text=${1:\"A\"}, x=${2:1}, y=${3:1}, z=${4:0}]/}",
  example: "{@s3.label[text=\"O\", x=0, y=0, z=0]/}",
});
registerObject({
  path: "scene.3d.vector",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Vecteur 3D (flèche) — forces, champs, déplacements.",
  attrs: [
    tuple("from", false, "Origine, ex. (0,0,0)."),
    tuple("to", false, "Extrémité, ex. (1,2,1)."),
    COLOR,
  ],
  snippet: "{@s3.vector[from=${1:\"(0,0,0)\"}, to=${2:\"(2,1,1)\"}, color=${3:\"#f59e0b\"}]/}",
  example: "{@s3.vector[from=\"(0,0,0)\", to=\"(2,1,1)\", color=\"#f59e0b\"]/}",
});
registerObject({
  path: "scene.3d.line",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Ligne / trajectoire 3D : liste de points séparés par ';'.",
  attrs: [
    tuple("points", false, "Points, ex. (0,0,0);(1,1,0);(2,0,1)."),
    COLOR,
  ],
  snippet: "{@s3.line[points=${1:\"(0,0,0);(1,1,0);(2,0,1)\"}, color=${2:\"#22d3ee\"}]/}",
  example: "{@s3.line[points=\"(0,0,0);(1,1,0);(2,0,1);(3,1,0)\", color=\"#22d3ee\"]/}",
});
registerObject({
  path: "scene.3d.surface",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Surface z = f(x, y) (expression mathématique évaluée).",
  attrs: [
    { name: "z", type: "string", required: false, default: "0", description: "Expression z=f(x,y), ex. sin(x)*cos(y)." },
    tuple("xrange", false, "Intervalle x, ex. (-3,3)."),
    tuple("yrange", false, "Intervalle y, ex. (-3,3)."),
    { name: "res", type: "number", required: false, default: "36", description: "Résolution de la grille." },
    COLOR,
    OPACITY,
  ],
  snippet: "{@s3.surface[z=${1:\"sin(x)*cos(y)\"}, xrange=\"(-3,3)\", yrange=\"(-3,3)\", color=${2:\"#60a5fa\"}]/}",
  example: "{@s3.surface[z=\"sin(x)*cos(y)\", xrange=\"(-3,3)\", yrange=\"(-3,3)\", color=\"#60a5fa\"]/}",
});
registerObject({
  path: "scene.3d.curve",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Courbe paramétrique 3D (x(t), y(t), z(t)).",
  attrs: [
    { name: "x", type: "string", required: false, default: "cos(t)", description: "x(t)." },
    { name: "y", type: "string", required: false, default: "sin(t)", description: "y(t)." },
    { name: "z", type: "string", required: false, default: "t/3", description: "z(t)." },
    tuple("trange", false, "Intervalle de t, ex. (0, 6.28)."),
    { name: "samples", type: "number", required: false, default: "200", description: "Nombre de points." },
    COLOR,
  ],
  snippet: "{@s3.curve[x=${1:\"cos(3*t)\"}, y=${2:\"sin(2*t)\"}, z=${3:\"sin(5*t)/2\"}, trange=\"(0, 6.28)\", color=${4:\"#22d3ee\"}]/}",
  example: "{@s3.curve[x=\"cos(t)\", y=\"sin(t)\", z=\"t/3\", trange=\"(0, 18)\", color=\"#22d3ee\"]/}",
});
registerObject({
  path: "scene.3d.axes",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Repère 3D (axes X/Y/Z) pour la référence.",
  attrs: [{ name: "size", type: "number", required: false, default: "3", description: "Longueur des axes." }],
  snippet: "{@s3.axes[size=${1:3}]/}",
  example: "{@s3.axes[size=3]/}",
});
registerObject({
  path: "scene.3d.grid",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Grille au sol 3D (plan de référence).",
  attrs: [
    { name: "size", type: "number", required: false, default: "10", description: "Étendue de la grille." },
    { name: "divisions", type: "number", required: false, default: "10", description: "Nombre de divisions." },
  ],
  snippet: "{@s3.grid[size=${1:10}, divisions=${2:10}]/}",
  example: "{@s3.grid[size=10, divisions=10]/}",
});
registerObject({
  path: "scene.3d.animate",
  contentModel: "void",
  category: "géométrie",
  aliases: [],
  description: "Animation d'un objet (par id) : move / rotate / scale / color / fade / transform.",
  attrs: [
    { name: "target", type: "string", required: true, description: "id de l'objet à animer." },
    { name: "action", type: "string", required: false, default: "move", description: "move | rotate | scale | color | fade | transform." },
    tuple("to", false, "Destination : (x,y,z) pour move, ou un id pour transform."),
    { name: "axis", type: "string", required: false, default: "y", description: "Axe de rotation (x/y/z)." },
    { name: "angle", type: "number", required: false, default: "90", description: "Angle de rotation (degrés)." },
    { name: "value", type: "number", required: false, description: "Échelle (scale) ou opacité (fade)." },
    COLOR,
    { name: "duration", type: "number", required: false, default: "1", description: "Durée (secondes)." },
    { name: "delay", type: "number", required: false, default: "0", description: "Délai avant départ." },
    { name: "at", type: "number", required: false, description: "Départ absolu (sinon enchaîné après la précédente)." },
    { name: "easing", type: "string", required: false, default: "easeInOut", description: "linear | easeIn | easeOut | easeInOut." },
  ],
  snippet: "{@s3.animate[target=${1:\"A\"}, action=${2:\"move\"}, to=${3:\"(2,2,0)\"}, duration=${4:2}]/}",
  example: "{@s3.animate[target=\"A\", action=\"move\", to=\"(2,2,0)\", duration=2]/}",
});

/* -------------------------------------------------------------------------- */
/* Common HTML elements (kind "element"): introspectable but NOT @-objects,    */
/* so they never affect the lexer/parser.                                      */
/* -------------------------------------------------------------------------- */

const HREF: AttrSchema = { name: "href", type: "string", required: false, description: "URL de destination." };
const CLASS: AttrSchema = { name: "class", type: "string", required: false, description: "Classes CSS (ex. Tailwind)." };

function el(
  path: string,
  description: string,
  snippet: string,
  example: string,
  attrs: AttrSchema[] = [],
): void {
  registerObject({ path, kind: "element", contentModel: "html", category: "structure", aliases: [], description, attrs, snippet, example });
}

el("h1", "Titre de niveau 1.", "{h1:${1:Titre}}", "{h1:Titre principal}");
el("h2", "Titre de niveau 2.", "{h2:${1:Sous-titre}}", "{h2:Sous-titre}");
el("h3", "Titre de niveau 3.", "{h3:${1:Titre}}", "{h3:Titre}");
el("p", "Paragraphe de texte.", "{p:${1:Un paragraphe.}}", "{p:Un paragraphe.}");
el("strong", "Texte en gras.", "{strong:${1:texte}}", "{p:du {strong:gras} ici}");
el("em", "Texte en italique.", "{em:${1:texte}}", "{p:de l'{em:italique} ici}");
el("code", "Code en ligne.", "{code:${1:code}}", "{p:appelez {code:f(x)}}");
el("a", "Lien hypertexte.", "{a[href=${1:\"https://exemple.fr\"}]:${2:lien}}", "{a[href=\"https://exemple.fr\"]:un lien}", [HREF]);
el("ul", "Liste à puces.", "{ul:{li:${1:premier}}{li:${2:deuxième}}}", "{ul:{li:premier}{li:deuxième}}");
el("ol", "Liste numérotée.", "{ol:{li:${1:premier}}{li:${2:deuxième}}}", "{ol:{li:un}{li:deux}}");
el("li", "Élément de liste.", "{li:${1:item}}", "{ul:{li:item}}");
el("blockquote", "Citation en bloc.", "{blockquote:${1:citation}}", "{blockquote:Une citation.}");
el(
  "table",
  "Tableau.",
  "{table:{tr:{th:${1:Colonne 1}}{th:${2:Colonne 2}}}{tr:{td:${3:a}}{td:${4:b}}}}",
  "{table:{tr:{th:A}{th:B}}{tr:{td:1}{td:2}}}",
);
el("img", "Image.", "{img[src=${1:\"image.png\"}, alt=${2:\"description\"}]/}", "{img[src=\"image.png\", alt=\"une image\"]/}", [
  { name: "src", type: "string", required: true, description: "Chemin de l'image." },
  { name: "alt", type: "string", required: false, description: "Texte alternatif." },
]);
el("hr", "Séparateur horizontal.", "{hr/}", "{hr/}");
el("div", "Conteneur (avec classes CSS).", "{div[class=${1:\"\"}]:${2:contenu}}", "{div[class=\"box\"]:contenu}", [CLASS]);
