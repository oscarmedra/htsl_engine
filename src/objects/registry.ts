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

export interface ObjectMeta {
  path: string;
  contentModel: ContentModel;
  aliases: string[];
  description: string;
  attrs: AttrSchema[];
  example: string;
}

export interface RegistryEntry {
  path: string;
  aliases: string[];
  kind: "object";
  description: string;
}

/** Collection-prefix aliases: first dotted segment is expanded. */
const COLLECTION_ALIASES: Record<string, string> = {
  mt: "math.text",
  mc: "math.constant",
  mo: "math.object",
  mg2: "math.geometry.2d",
  mg3: "math.geometry.3d",
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

export function registerObject(meta: Omit<ObjectMeta, "aliases"> & { aliases?: string[] }): void {
  const flat = meta.aliases ?? [];
  const collection = collectionAliasOf(meta.path);
  const aliases = [...flat];
  if (collection && !aliases.includes(collection)) aliases.push(collection);

  const full: ObjectMeta = { ...meta, aliases };
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

export function isKnownObject(raw: string): boolean {
  return OBJECTS.has(resolvePath(raw));
}

export function contentModelOf(raw: string): ContentModel {
  return OBJECTS.get(resolvePath(raw))?.contentModel ?? "html";
}

/* -------------------------------------------------------------------------- */
/* Introspection                                                              */
/* -------------------------------------------------------------------------- */

export function listObjects(): RegistryEntry[] {
  return [...OBJECTS.values()]
    .map((m) => ({ path: m.path, aliases: m.aliases, kind: "object" as const, description: m.description }))
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
  aliases: ["mti"],
  description: "Formule LaTeX dans le flux du texte.",
  attrs: [],
  example: "{@mti: x^2 + 1}",
});
registerObject({
  path: "math.text.block",
  contentModel: "math",
  aliases: ["mtb"],
  description: "Formule centrée sur sa propre ligne.",
  attrs: [],
  example: "{@mtb: \\int_0^1 x^2 \\, dx}",
});
registerObject({
  path: "math.text.equation",
  contentModel: "math",
  aliases: ["mte"],
  description: "Équation numérotée automatiquement.",
  attrs: [{ name: "label", type: "string", required: false, description: "Étiquette pour les références croisées." }],
  example: "{@mte[label=eq1]: E = mc^2}",
});
registerObject({
  path: "math.text.ref",
  contentModel: "void",
  aliases: ["mtr"],
  description: "Référence croisée vers une équation numérotée.",
  attrs: [{ name: "to", type: "string", required: true, description: "Label de l'équation cible." }],
  example: "{@mtr[to=eq1]/}",
});
registerObject({
  path: "math.text.align",
  contentModel: "html",
  aliases: ["mta"],
  description: "Équations alignées (enfants {line: ...}).",
  attrs: [],
  example: "{@mta:\n  {line: f(x) &= x^2}\n  {line: &= x \\cdot x}\n}",
});
registerObject({
  path: "math.text.cases",
  contentModel: "html",
  aliases: ["mtc"],
  description: "Définition par cas (enfants {case: ...}).",
  attrs: [{ name: "intro", type: "string", required: false, description: "Membre de gauche (ex. |x|)." }],
  example: "{@mtc[intro=\"|x|\"]:\n  {case: x & \\text{si } x \\geq 0}\n  {case: -x & \\text{si } x < 0}\n}",
});
registerObject({
  path: "math.text.system",
  contentModel: "html",
  aliases: ["mts"],
  description: "Système d'équations avec accolade (enfants {line: ...}).",
  attrs: [],
  example: "{@mts:\n  {line: 2x + y = 5}\n  {line: x - y = 1}\n}",
});

// --- math.object / math.constant ---
registerObject({
  path: "math.object.fraction",
  contentModel: "html",
  aliases: ["mof"],
  description: "Fraction \\frac{}{} (enfants {num:...} et {den:...}).",
  attrs: [],
  example: "{@mof:{num:1}{den:2}}",
});
registerObject({
  path: "math.constant.pi",
  contentModel: "void",
  aliases: [],
  description: "Constante π.",
  attrs: [],
  example: "{@mc.pi/}",
});

// --- 2D geometry ---
registerObject({
  path: "math.geometry.2d.scene",
  contentModel: "html",
  aliases: [],
  description: "Scène géométrique 2D (conteneur rendu via Plotly).",
  attrs: [
    { name: "width", type: "number", required: false, default: "600", description: "Largeur en pixels." },
    { name: "height", type: "number", required: false, default: "400", description: "Hauteur en pixels." },
  ],
  example: "{@mg2.scene:\n  {@mg2.frame[grid=true]/}\n  {@mg2.circle[center=\"(0,0)\", radius=2]/}\n}",
});
registerObject({
  path: "math.geometry.2d.frame",
  contentModel: "void",
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
  example: "{@mg2.frame[xrange=\"(-4,4)\", yrange=\"(-3,3)\", grid=true, ticks=1]/}",
});
registerObject({
  path: "math.geometry.2d.point",
  contentModel: "void",
  aliases: [],
  description: "Point 2D.",
  attrs: [
    { name: "x", type: "number", required: true, description: "Abscisse." },
    { name: "y", type: "number", required: true, description: "Ordonnée." },
    NAME,
    COLOR,
  ],
  example: "{@mg2.point[x=1, y=2, name=A]/}",
});
registerObject({
  path: "math.geometry.2d.cpoint",
  contentModel: "void",
  aliases: [],
  description: "Point d'affixe complexe (a+bi).",
  attrs: [
    { name: "z", type: "complex", required: true, description: "Affixe, ex. 3+2i, -1-2i, i." },
    NAME,
    COLOR,
  ],
  example: "{@mg2.cpoint[z=\"3+2i\", name=A]/}",
});
registerObject({
  path: "math.geometry.2d.segment",
  contentModel: "void",
  aliases: [],
  description: "Segment 2D entre deux points.",
  attrs: [tuple("from", true, "Première extrémité, ex. (0,0)."), tuple("to", true, "Seconde extrémité."), COLOR],
  example: "{@mg2.segment[from=\"(0,0)\", to=\"(3,4)\"]/}",
});
registerObject({
  path: "math.geometry.2d.circle",
  contentModel: "void",
  aliases: [],
  description: "Cercle 2D.",
  attrs: [tuple("center", false, "Centre, ex. (0,0)."), { name: "radius", type: "number", required: false, default: "1", description: "Rayon." }, COLOR, OPACITY],
  example: "{@mg2.circle[center=\"(0,0)\", radius=2]/}",
});
registerObject({
  path: "math.geometry.2d.polygon",
  contentModel: "void",
  aliases: [],
  description: "Polygone 2D rempli.",
  attrs: [{ name: "points", type: "points", required: true, description: "Sommets séparés par ;, ex. (0,0);(2,0);(1,2)." }, COLOR, OPACITY],
  example: "{@mg2.polygon[points=\"(-2,-2);(2,-2);(0,3)\"]/}",
});
registerObject({
  path: "math.geometry.2d.droite",
  contentModel: "void",
  aliases: [],
  description: "Droite 2D (point + direction).",
  attrs: [tuple("point", false, "Point de passage."), tuple("dir", false, "Vecteur directeur, ex. (1,1)."), COLOR],
  example: "{@mg2.droite[point=\"(0,0)\", dir=\"(1,1)\"]/}",
});

// --- 3D geometry ---
registerObject({
  path: "math.geometry.3d.scene",
  contentModel: "html",
  aliases: [],
  description: "Scène géométrique 3D (conteneur rendu via Plotly).",
  attrs: [
    { name: "width", type: "number", required: false, default: "600", description: "Largeur en pixels." },
    { name: "height", type: "number", required: false, default: "400", description: "Hauteur en pixels." },
  ],
  example: "{@mg3.scene:\n  {@mg3.space[grid=true]/}\n  {@mg3.sphere[center=\"(0,0,0)\", radius=2]/}\n}",
});
registerObject({
  path: "math.geometry.3d.space",
  contentModel: "void",
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
  example: "{@mg3.space[xrange=\"(-5,5)\", grid=true, ticks=2]/}",
});
registerObject({
  path: "math.geometry.3d.point",
  contentModel: "void",
  aliases: [],
  description: "Point 3D.",
  attrs: [
    { name: "x", type: "number", required: true, description: "Abscisse." },
    { name: "y", type: "number", required: true, description: "Ordonnée." },
    { name: "z", type: "number", required: true, description: "Cote." },
    NAME,
    COLOR,
  ],
  example: "{@mg3.point[x=1, y=2, z=3, name=A]/}",
});
registerObject({
  path: "math.geometry.3d.vector",
  contentModel: "void",
  aliases: [],
  description: "Vecteur 3D (flèche avec cône).",
  attrs: [tuple("from", true, "Origine, ex. (1,2,3)."), tuple("to", true, "Extrémité."), COLOR],
  example: "{@mg3.vector[from=\"(1,2,3)\", to=\"(1,3,4)\"]/}",
});
registerObject({
  path: "math.geometry.3d.segment",
  contentModel: "void",
  aliases: [],
  description: "Segment 3D entre deux points.",
  attrs: [tuple("from", true, "Première extrémité."), tuple("to", true, "Seconde extrémité."), COLOR],
  example: "{@mg3.segment[from=\"(-2,-2,-2)\", to=\"(2,2,2)\"]/}",
});
registerObject({
  path: "math.geometry.3d.line",
  contentModel: "void",
  aliases: [],
  description: "Droite 3D (point + direction).",
  attrs: [tuple("point", false, "Point de passage."), tuple("dir", false, "Vecteur directeur."), COLOR],
  example: "{@mg3.line[point=\"(0,0,0)\", dir=\"(1,0,0)\"]/}",
});
registerObject({
  path: "math.geometry.3d.plane",
  contentModel: "void",
  aliases: [],
  description: "Plan 3D (équation normale·X = d), rendu en surface.",
  attrs: [tuple("normal", true, "Vecteur normal, ex. (2,-1,3)."), { name: "d", type: "number", required: false, default: "0", description: "Terme constant." }, COLOR, OPACITY],
  example: "{@mg3.plane[normal=\"(2,-1,3)\", d=5, opacity=0.5]/}",
});
registerObject({
  path: "math.geometry.3d.sphere",
  contentModel: "void",
  aliases: [],
  description: "Sphère 3D (surface paramétrique).",
  attrs: [tuple("center", false, "Centre, ex. (0,0,0)."), { name: "radius", type: "number", required: false, default: "1", description: "Rayon." }, COLOR, OPACITY],
  example: "{@mg3.sphere[center=\"(0,0,0)\", radius=2]/}",
});
