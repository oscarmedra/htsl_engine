/**
 * Contextual autocompletion, wired to the engine's introspection API.
 *
 *   {@…   → registered objects + components (paths and aliases, with descriptions)
 *   […    → attributes of the enclosing known object (types + defaults)
 *   {$…   → variables defined in the document
 *   {!…   → directives (define / set)
 *
 * Components and variables are read from the latest parse, so suggestions update
 * as the user edits.
 */
import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { parse, registry } from "htsl";
import type { ComponentInfo } from "htsl";

interface DocSymbols {
  components: ComponentInfo[];
  variables: string[];
}

/** Parse the document on demand so suggestions reflect the latest edits. */
function symbolsOf(src: string): DocSymbols {
  try {
    const ast = parse(src, { mode: "tolerant" });
    return { components: registry.components(ast), variables: registry.variables(ast) };
  } catch {
    return { components: [], variables: [] };
  }
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

export function htslCompletions() {
  return (ctx: CompletionContext): CompletionResult | null => {
    const before = ctx.state.sliceDoc(0, ctx.pos);
    const symbols = symbolsOf(ctx.state.doc.toString());

    // {@object / component
    let m = /\{@([A-Za-z0-9_.-]*)$/.exec(before);
    if (m) {
      const options: Completion[] = [];
      for (const e of registry.list()) {
        options.push({ label: e.path, type: "class", detail: "objet", info: e.description });
        for (const a of e.aliases) {
          options.push({ label: a, type: "class", detail: e.path, info: e.description });
        }
      }
      for (const c of symbols.components) {
        const params = c.params.map((p) => p.name + (p.default != null ? `=${p.default}` : "")).join(", ");
        options.push({ label: c.name, type: "function", detail: "composant", info: params ? `[${params}]` : "composant" });
      }
      return { from: ctx.pos - (m[1] ?? "").length, options, validFor: /^[A-Za-z0-9_.-]*$/ };
    }

    // {$variable
    m = /\{\$([A-Za-z0-9_-]*)$/.exec(before);
    if (m) {
      const options: Completion[] = symbols.variables.map((v) => ({ label: v, type: "variable" }));
      return { from: ctx.pos - (m[1] ?? "").length, options };
    }

    // {!directive
    m = /\{!([a-zA-Z]*)$/.exec(before);
    if (m) {
      const options: Completion[] = [
        { label: "define", type: "keyword", info: "Définit un composant réutilisable." },
        { label: "set", type: "keyword", info: "Définit une variable de document." },
        { label: "--", type: "keyword", detail: "commentaire", info: "Commentaire {!-- … --}." },
      ];
      return { from: ctx.pos - (m[1] ?? "").length, options };
    }

    // [attribute] of a known object or component
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
      const comp = symbols.components.find((c) => c.name === actx.name);
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
