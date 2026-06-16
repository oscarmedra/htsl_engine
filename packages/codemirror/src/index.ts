/**
 * htsl-codemirror — reusable CodeMirror 6 extensions for HTSL.
 *
 *   import { htslLanguage, htslCompletion, htslLinter } from "htsl-codemirror";
 */
export { htslLanguage, htslTokens } from "./language.js";
export type { HtslToken } from "./language.js";

export { htslCompletion } from "./completion.js";
export type { CompletionRegistry } from "./completion.js";

export { htslLinter, htslDiagnostics } from "./linter.js";
export type { ParseFn, HtslDiagnostic } from "./linter.js";
