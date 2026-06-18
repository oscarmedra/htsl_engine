/**
 * Contextual autocompletion wired to the engine's introspection registry.
 * Everything is generated from `registry.list()` / `describe()` — nothing is
 * hard-coded.
 *
 *   {@…   → registered @-objects + components, inserted as hole-snippets
 *   /…    → slash command at line start: ALL entries (objects, HTML, components)
 *   […    → attributes of the enclosing known object (types + defaults)
 *   {$…   → variables defined in the document
 *   {!…   → directives (define / set)
 */
import {
  snippet,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { parse } from "@noah-medra/htsl-core";
import type { ComponentInfo, Node, ObjectMeta, RegistryEntry } from "@noah-medra/htsl-core";

/** Minimal shape of the introspection registry needed for completion. */
export interface CompletionRegistry {
  list(): RegistryEntry[];
  describe(pathOrAlias: string): ObjectMeta | null;
  components(ast: Node[]): ComponentInfo[];
  variables(ast: Node[]): string[];
}

const CATEGORY_TYPE: Record<string, string> = {
  structure: "type",
  formules: "function",
  géométrie: "class",
  document: "keyword",
};

function attrContext(before: string): { name: string; isObject: boolean } | null {
  const lb = before.lastIndexOf("[");
  if (lb < 0) return null;
  const after = before.slice(lb + 1);
  if (after.includes("]") || after.includes("}")) return null;
  const seg = after.split(",").pop() ?? "";
  if (seg.includes("=")) return null;
  const head = before.slice(0, lb);
  const m = /\{(@?)([A-Za-z0-9_.-]+)((?:[.#][A-Za-z0-9_-]+)*)$/.exec(head);
  if (!m) return null;
  return { name: m[2] ?? "", isObject: m[1] === "@" };
}

/** Build the CodeMirror `${…}` snippet template for a document component. */
function componentSnippet(c: ComponentInfo): string {
  const params = c.params
    // Param name as a non-empty placeholder value when there is no default, so
    // the inserted component is valid HTSL (an empty `name=` is malformed).
    .map((p, i) => p.name + "=${" + (i + 1) + ":" + (p.default ?? p.name) + "}")
    .join(", ");
  const head = params ? `{@${c.name}[${params}]` : `{@${c.name}`;
  return head + ": ${" + (c.params.length + 1) + ":Contenu du conteneur.}}";
}

function entryCompletion(e: RegistryEntry): Completion {
  return {
    label: e.path,
    detail: e.aliases[0] ?? e.kind,
    info: e.description,
    type: CATEGORY_TYPE[e.category] ?? "text",
    apply: snippet(e.snippet),
  };
}

export function htslCompletion(registry: CompletionRegistry): CompletionSource {
  return (ctx: CompletionContext): CompletionResult | null => {
    const before = ctx.state.sliceDoc(0, ctx.pos);

    let ast: Node[] = [];
    try {
      ast = parse(ctx.state.doc.toString(), { mode: "tolerant" });
    } catch {
      ast = [];
    }

    // {@ object / component. Filtering must run on the NAME query only, so the
    // result starts AFTER the "{@" (otherwise CodeMirror matches option labels
    // like "mti" against "{@m" and hides everything). The snippet still replaces
    // from the "{@" via a custom apply — same pattern as the slash command.
    let m = /\{@([A-Za-z0-9_.-]*)$/.exec(before);
    if (m) {
      const at = m.index; // position of "{@"
      const withApply = (base: Completion, template: string): Completion => ({
        ...base,
        apply: (v, c, _from, to) => {
          // closeBrackets auto-inserts a "}" right after the "{@"; the snippet
          // already provides its own closing brace, so consume the stray one.
          const end = v.state.sliceDoc(to, to + 1) === "}" ? to + 1 : to;
          snippet(template)(v, c, at, end);
        },
      });
      const options: Completion[] = [];
      for (const e of registry.list()) {
        if (e.kind !== "object") continue;
        options.push(withApply(entryCompletion(e), e.snippet));
        for (const a of e.aliases) {
          options.push(withApply({ ...entryCompletion(e), label: a, detail: e.path }, e.snippet));
        }
      }
      for (const c of registry.components(ast)) {
        options.push(
          withApply({ label: c.name, detail: "composant", type: "function" }, componentSnippet(c)),
        );
      }
      return { from: at + 2, options, validFor: /^[\w.-]*$/ };
    }

    // Slash command at line start → all entries (objects, HTML, components).
    // The query filters on the text AFTER the "/", but inserting replaces from
    // the "/" so it is removed.
    const line = ctx.state.doc.lineAt(ctx.pos);
    const lineBefore = ctx.state.sliceDoc(line.from, ctx.pos);
    const slash = /^(\s*)\/[\w.-]*$/.exec(lineBefore);
    if (slash) {
      const slashAt = line.from + (slash[1] ?? "").length; // position of "/"
      const withApply = (template: string, base: Completion): Completion => ({
        ...base,
        apply: (v, c, _from, to) => snippet(template)(v, c, slashAt, to),
      });
      const options: Completion[] = registry.list().map((e) => withApply(e.snippet, entryCompletion(e)));
      for (const c of registry.components(ast)) {
        options.push(
          withApply(componentSnippet(c), { label: c.name, detail: "composant", type: "function" }),
        );
      }
      return { from: slashAt + 1, options };
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
