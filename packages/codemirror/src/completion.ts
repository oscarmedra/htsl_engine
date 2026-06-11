/**
 * Contextual autocompletion wired to the engine's introspection registry.
 *
 *   {@…   → registered objects + components (paths/aliases, with descriptions)
 *   […    → attributes of the enclosing known object (types + defaults)
 *   {$…   → variables defined in the document
 *   {!…   → directives (define / set)
 *
 * Components and variables are read from a fresh tolerant parse of the document,
 * so suggestions update as the user defines new components or variables.
 */
import type { Completion, CompletionContext, CompletionResult, CompletionSource } from "@codemirror/autocomplete";
import { parse } from "htsl";
import type { ComponentInfo, Node, ObjectMeta, RegistryEntry } from "htsl";

/** Minimal shape of the introspection registry needed for completion. */
export interface CompletionRegistry {
  list(): RegistryEntry[];
  describe(pathOrAlias: string): ObjectMeta | null;
  components(ast: Node[]): ComponentInfo[];
  variables(ast: Node[]): string[];
}

function attrContext(before: string): { name: string; isObject: boolean } | null {
  const lb = before.lastIndexOf("[");
  if (lb < 0) return null;
  const after = before.slice(lb + 1);
  if (after.includes("]") || after.includes("}")) return null;
  // Typing a value (after =) rather than an attribute name.
  const seg = after.split(",").pop() ?? "";
  if (seg.includes("=")) return null;
  const head = before.slice(0, lb);
  const m = /\{(@?)([A-Za-z0-9_.-]+)((?:[.#][A-Za-z0-9_-]+)*)$/.exec(head);
  if (!m) return null;
  return { name: m[2] ?? "", isObject: m[1] === "@" };
}

/** Build a CodeMirror completion source from an introspection registry. */
export function htslCompletion(registry: CompletionRegistry): CompletionSource {
  return (ctx: CompletionContext): CompletionResult | null => {
    const before = ctx.state.sliceDoc(0, ctx.pos);

    let ast: Node[] = [];
    try {
      ast = parse(ctx.state.doc.toString(), { mode: "tolerant" });
    } catch {
      ast = [];
    }

    // {@ object / component
    let m = /\{@([A-Za-z0-9_.-]*)$/.exec(before);
    if (m) {
      const options: Completion[] = [];
      for (const e of registry.list()) {
        options.push({ label: e.path, type: "class", detail: "objet", info: e.description });
        for (const a of e.aliases) {
          options.push({ label: a, type: "class", detail: e.path, info: e.description });
        }
      }
      for (const c of registry.components(ast)) {
        const params = c.params.map((p) => p.name + (p.default != null ? `=${p.default}` : "")).join(", ");
        options.push({ label: c.name, type: "function", detail: "composant", info: params ? `[${params}]` : "composant" });
      }
      return { from: ctx.pos - (m[1] ?? "").length, options, validFor: /^[A-Za-z0-9_.-]*$/ };
    }

    // {$ variable
    m = /\{\$([A-Za-z0-9_-]*)$/.exec(before);
    if (m) {
      const options: Completion[] = registry.variables(ast).map((v) => ({ label: v, type: "variable" }));
      return { from: ctx.pos - (m[1] ?? "").length, options };
    }

    // {! directive
    m = /\{!([a-zA-Z]*)$/.exec(before);
    if (m) {
      const options: Completion[] = [
        { label: "define", type: "keyword", info: "Définit un composant réutilisable." },
        { label: "set", type: "keyword", info: "Définit une variable de document." },
        { label: "--", type: "keyword", detail: "commentaire", info: "Commentaire {!-- … --}." },
      ];
      return { from: ctx.pos - (m[1] ?? "").length, options };
    }

    // [ attribute ] of a known object or component
    const actx = attrContext(before);
    if (actx && actx.isObject) {
      const word = /([A-Za-z0-9_-]*)$/.exec(before)?.[1] ?? "";
      const meta = registry.describe(actx.name);
      if (meta) {
        const options: Completion[] = meta.attrs.map((a) => ({
          label: a.name,
          type: "property",
          detail: a.type + (a.required ? " · requis" : a.default !== undefined ? ` · ${a.default}` : ""),
          info: a.description,
        }));
        return { from: ctx.pos - word.length, options, validFor: /^[A-Za-z0-9_-]*$/ };
      }
      const comp = registry.components(ast).find((c) => c.name === actx.name);
      if (comp) {
        const options: Completion[] = comp.params.map((p) => ({
          label: p.name,
          type: "property",
          detail: p.default != null ? `défaut ${p.default}` : "requis",
        }));
        return { from: ctx.pos - word.length, options, validFor: /^[A-Za-z0-9_-]*$/ };
      }
    }

    return null;
  };
}
