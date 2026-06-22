/**
 * Slide-deck object (`{@slide: {section:…} {section:…}}`).
 *
 * A deck is a normal declarative node — the renderer emits a `data-htsl-slides`
 * structure (sections + nav buttons + counter), and the engine's single runtime
 * wires up the button/keyboard navigation. The content never produces JS.
 */
export const SLIDE_PATH = "slide.deck";

/** True for the slide-deck object (resolved path, e.g. via the `slide` alias). */
export function isSlidePath(path: string): boolean {
  return path === SLIDE_PATH || path.startsWith("slide.");
}
