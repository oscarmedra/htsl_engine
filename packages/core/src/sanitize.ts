/**
 * Attribute sanitisation — a second line of defence beyond HTML-escaping.
 *
 * Escaping neutralizes markup injection (`<`, `>`, `"`) but a well-formed
 * attribute can still carry a live script through two vectors escaping never
 * touches: inline event handlers (`onclick`, `onerror`, …) and `javascript:`/
 * `data:`/`vbscript:` URLs in attributes the browser treats as navigable/
 * loadable (`href`, `src`, `srcset`, …).
 */

/** HTML attributes whose value the browser resolves as a URL. */
const URL_ATTRS = new Set([
  "href",
  "src",
  "srcset",
  "poster",
  "cite",
  "action",
  "formaction",
  "data",
  "background",
  "longdesc",
  "usemap",
  "manifest",
  "ping",
  "xlink:href",
]);

const DANGEROUS_SCHEMES = ["javascript:", "data:", "vbscript:"];

const CONTROL_OR_SPACE = /^[\x00-\x20]+/;
const TAB_OR_NEWLINE = /[\t\n\r]/g;

/**
 * Strip characters browsers ignore when parsing a URL: tab/newline are
 * removed wherever they occur (a classic `java\tscript:` obfuscation), then
 * leading control characters/spaces are trimmed.
 */
function normalizeUrl(value: string): string {
  return value.replace(TAB_OR_NEWLINE, "").replace(CONTROL_OR_SPACE, "");
}

/**
 * Whether an attribute is safe to emit as a live HTML attribute. Returns
 * `false` for any `on*` event handler, the `style` attribute, and dangerous
 * URL schemes in URL-bearing attributes — regardless of case or whitespace
 * obfuscation.
 */
export function isAttrSafe(name: string, value: string): boolean {
  const lower = name.toLowerCase();
  if (lower.startsWith("on")) return false;
  if (lower === "style") return false;
  if (URL_ATTRS.has(lower)) {
    const cleaned = normalizeUrl(value).toLowerCase();
    if (DANGEROUS_SCHEMES.some((scheme) => cleaned.startsWith(scheme))) return false;
  }
  return true;
}
