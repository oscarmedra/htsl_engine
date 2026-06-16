/**
 * CodeMirror linter for HTSL.
 *
 * Uses the engine's tolerant parser: lexer/parser problems become recovered
 * `error` nodes carrying the original {@link HTSLError} message and location.
 * `htslLinter(parse)` turns those into underlined CodeMirror diagnostics.
 */
import { linter, type Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { Node, ParseOptions } from "htsl-engine";

export type ParseFn = (source: string, options?: ParseOptions) => Node[];

export interface HtslDiagnostic {
  line: number;
  col: number;
  message: string;
}

function walk(nodes: Node[], out: HtslDiagnostic[]): void {
  for (const n of nodes) {
    if (n.type === "error") out.push({ line: n.loc.line, col: n.loc.col, message: n.message });
    if (n.type === "element" || n.type === "object") walk(n.children, out);
    else if (n.type === "define") walk(n.body, out);
    else if (n.type === "set") walk(n.value, out);
  }
}

/** Pure helper: tolerant-parse `text` and return localized diagnostics. */
export function htslDiagnostics(text: string, parse: ParseFn): HtslDiagnostic[] {
  let ast: Node[] = [];
  try {
    ast = parse(text, { mode: "tolerant" });
  } catch {
    return [];
  }
  const out: HtslDiagnostic[] = [];
  walk(ast, out);
  return out;
}

/** CodeMirror extension producing underlined diagnostics from HTSL errors. */
export function htslLinter(parse: ParseFn): Extension {
  return linter((view: EditorView): Diagnostic[] => {
    const doc = view.state.doc;
    return htslDiagnostics(doc.toString(), parse).map((d) => {
      const line = d.line >= 1 && d.line <= doc.lines ? doc.line(d.line) : doc.line(1);
      const from = Math.min(line.from + Math.max(0, d.col - 1), line.to);
      return { from, to: Math.min(from + 1, doc.length), severity: "error", message: d.message };
    });
  });
}
