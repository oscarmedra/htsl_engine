/**
 * Object registry: maps `{@path:...}` paths (and their aliases) to a canonical
 * name and a content model. Kept dependency-free and consulted by both the
 * lexer (to choose how to read an object's content) and the renderer.
 *
 * Content models:
 *   - "math": content is raw LaTeX text plus nested `{@...}` objects
 *   - "html": content is ordinary HTSL nodes (e.g. `{line:...}`, `{num:...}`)
 *   - "void": self-closing only, no content
 */

export type ContentModel = "math" | "html" | "void";

/** Flat aliases (single token, no dot). */
const ALIASES: Record<string, string> = {
  mti: "math.text.inline",
  mtb: "math.text.block",
  mte: "math.text.equation",
  mtr: "math.text.ref",
  mta: "math.text.align",
  mtc: "math.text.cases",
  mts: "math.text.system",
  mof: "math.object.fraction",
};

/** Collection-prefix aliases: first dotted segment is expanded. */
const COLLECTION_ALIASES: Record<string, string> = {
  mt: "math.text",
  mc: "math.constant",
  mo: "math.object",
  mg2: "math.geometry.2d",
  mg3: "math.geometry.3d",
};

/** Canonical object → content model. The set of known objects. */
const CONTENT: Record<string, ContentModel> = {
  "math.text.inline": "math",
  "math.text.block": "math",
  "math.text.equation": "math",
  "math.text.ref": "void",
  "math.text.align": "html",
  "math.text.cases": "html",
  "math.text.system": "html",
  "math.object.fraction": "html",
  "math.constant.pi": "void",

  // 2D geometry
  "math.geometry.2d.scene": "html",
  "math.geometry.2d.point": "void",
  "math.geometry.2d.segment": "void",
  "math.geometry.2d.circle": "void",
  "math.geometry.2d.polygon": "void",
  "math.geometry.2d.droite": "void",

  // 3D geometry
  "math.geometry.3d.scene": "html",
  "math.geometry.3d.point": "void",
  "math.geometry.3d.vector": "void",
  "math.geometry.3d.segment": "void",
  "math.geometry.3d.line": "void",
  "math.geometry.3d.plane": "void",
  "math.geometry.3d.sphere": "void",
};

/** Resolve a written path/alias to its canonical dotted path. */
export function resolvePath(raw: string): string {
  const flat = ALIASES[raw];
  if (flat) return flat;

  const dot = raw.indexOf(".");
  if (dot > 0) {
    const head = raw.slice(0, dot);
    const expanded = COLLECTION_ALIASES[head];
    if (expanded) return expanded + raw.slice(dot);
  }
  return raw;
}

/** Whether a (raw) path refers to a known registered object. */
export function isKnownObject(raw: string): boolean {
  return resolvePath(raw) in CONTENT;
}

/** Content model for a written path/alias (defaults to "html" if unknown). */
export function contentModelOf(raw: string): ContentModel {
  return CONTENT[resolvePath(raw)] ?? "html";
}
