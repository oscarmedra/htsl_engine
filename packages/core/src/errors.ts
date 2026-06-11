/**
 * Localized error type for the HTSL engine.
 *
 * An HTSLError carries the 1-based line/column of the offending character and
 * renders a source excerpt with a `^` cursor underneath it.
 */
import type { Loc } from "./types.js";

export class HTSLError extends Error {
  readonly line: number;
  readonly col: number;
  /** A multi-line excerpt of the source with a caret pointing at the error. */
  readonly excerpt: string;

  constructor(message: string, loc: Loc, source?: string) {
    const excerpt = source ? buildExcerpt(source, loc) : "";
    const header = `HTSL Error (ligne ${loc.line}, col ${loc.col}) : ${message}`;
    super(excerpt ? `${header}\n${excerpt}` : header);
    this.name = "HTSLError";
    this.line = loc.line;
    this.col = loc.col;
    this.excerpt = excerpt;
    // Restore prototype chain for instanceof to work after transpilation.
    Object.setPrototypeOf(this, HTSLError.prototype);
  }
}

/**
 * Build a two-line excerpt:
 *
 *   4 |   {p:Texte sans fermeture
 *     |   ^
 */
function buildExcerpt(source: string, loc: Loc): string {
  const lines = source.split(/\r\n|\r|\n/);
  const lineText = lines[loc.line - 1] ?? "";
  const gutter = String(loc.line);
  const pad = " ".repeat(gutter.length);

  const codeLine = `  ${gutter} | ${lineText}`;
  // col is 1-based; place the caret under that column.
  const caretIndent = " ".repeat(Math.max(0, loc.col - 1));
  const caretLine = `  ${pad} | ${caretIndent}^`;

  return `${codeLine}\n${caretLine}`;
}
