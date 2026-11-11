/**
 * Static analysis for HTSL source — the foundation of `htsl check` and of the
 * editor's error reporting. It never throws: it returns a list of diagnostics with
 * line/column, the faulty source line, and (when possible) a suggestion.
 *
 * Covers today:
 *  - syntax errors recovered by the tolerant parser (unbalanced braces, …);
 *  - unknown objects `{@…}` (A4) with a "did you mean …?" suggestion;
 *  - invalid KaTeX formulas (A5) when a `katex` implementation is provided.
 */
import { parse } from "./parser.js";
import { isKnownObject, listObjects } from "./objects/registry.js";
import { latexOfObject } from "./objects/math.js";
import type { KatexLike, Node, ObjectNode } from "./types.js";

export interface Diagnostic {
  severity: "error" | "warning";
  line: number;
  col: number;
  /** Short, human message, e.g. `objet inconnu {@table}`. */
  message: string;
  /** The faulty source line (for display). */
  excerpt?: string | undefined;
  /** A correction hint, e.g. `{table}` or `{@truthtable}`. */
  suggestion?: string | undefined;
}

export interface DiagnoseOptions {
  /** A KaTeX implementation; when given, every formula is validated (A5). */
  katex?: KatexLike;
}

/** Levenshtein distance (bounded use → tiny inputs, no optimisation needed). */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array<number>(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

/** Every registered *object* name (paths + aliases), for `{@…}` suggestions. */
function objectNames(): string[] {
  const names: string[] = [];
  for (const e of listObjects()) {
    if (e.kind !== "object") continue;
    names.push(e.path);
    for (const a of e.aliases) names.push(a);
  }
  return names;
}

/** Is `name` a registered plain element (so the fix is `{name}`, not `{@name}`)? */
function isKnownElementName(name: string): boolean {
  for (const e of listObjects()) {
    if (e.kind !== "element") continue;
    if (e.path === name || e.aliases.includes(name)) return true;
  }
  return false;
}

/** The closest known object name within edit distance 2, or null. */
function closestObject(name: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = editDistance(name, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return bestD <= 2 ? best : null;
}

/** Depth-first walk over the AST. */
function walk(node: Node, fn: (n: Node) => void): void {
  fn(node);
  const kids = (node as { children?: Node[] }).children;
  if (Array.isArray(kids)) for (const c of kids) walk(c, fn);
}

/** Is this object node a formula (so it can be validated by KaTeX)? */
function mathLatex(node: ObjectNode): string | null {
  try {
    return latexOfObject(node);
  } catch {
    return null;
  }
}

export function diagnose(source: string, opts: DiagnoseOptions = {}): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const lines = source.split(/\r?\n/);
  const lineAt = (line: number): string | undefined => lines[line - 1];
  const push = (d: Diagnostic): void => {
    diags.push(d);
  };

  let ast: Node[];
  try {
    ast = parse(source, { mode: "tolerant" });
  } catch {
    return diags; // tolerant parse should not throw; bail safely if it does
  }

  // Component names defined in the file don't count as "unknown objects".
  const defined = new Set<string>();
  for (const n of ast) walk(n, (x) => {
    if (x.type === "define") defined.add(x.name);
  });

  const names = objectNames();

  for (const n of ast) {
    walk(n, (x) => {
      if (x.type === "error") {
        push({ severity: "error", line: x.loc.line, col: x.loc.col, message: x.message, excerpt: lineAt(x.loc.line) });
        return;
      }
      if (x.type !== "object") return;
      const o = x;

      // A4 — unknown object.
      if (!isKnownObject(o.path) && !defined.has(o.path) && !defined.has(o.rawPath)) {
        // Prefer `{name}` when it's a real element (the classic `{@table}` mistake),
        // else the closest known object within edit distance 2.
        const near = closestObject(o.rawPath, names);
        const suggestion = isKnownElementName(o.rawPath)
          ? `{${o.rawPath}} (élément, sans @)`
          : near
            ? `{@${near}}`
            : undefined;
        push({
          severity: "error",
          line: o.loc.line,
          col: o.loc.col,
          message: `objet inconnu {@${o.rawPath}}`,
          excerpt: lineAt(o.loc.line),
          suggestion,
        });
        return;
      }

      // A5 — invalid formula (only when a KaTeX implementation is supplied).
      if (opts.katex) {
        const tex = mathLatex(o);
        if (tex !== null && tex !== "") {
          try {
            opts.katex.renderToString(tex, { throwOnError: true });
          } catch (e) {
            push({
              severity: "error",
              line: o.loc.line,
              col: o.loc.col,
              message: `formule invalide : ${(e as Error).message.split("\n")[0]}`,
              excerpt: lineAt(o.loc.line),
              suggestion: tex,
            });
          }
        }
      }
    });
  }

  return diags;
}
