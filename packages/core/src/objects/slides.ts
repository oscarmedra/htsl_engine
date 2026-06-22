/**
 * Slide-deck objects:
 *   {@slider: {@slider.slide:…} {@slider.slide:…}}
 *
 * A deck is a normal declarative node — the renderer emits a `data-htsl-slides`
 * structure (slides + nav buttons + counter), and the engine's single runtime
 * wires up the button/keyboard navigation. The content never produces JS.
 */
export const SLIDER_DECK_PATH = "slider.deck";
export const SLIDER_SLIDE_PATH = "slider.slide";

/** True for any slider object (resolved path, e.g. via the `slider` alias). */
export function isSlidePath(path: string): boolean {
  return path === SLIDER_DECK_PATH || path.startsWith("slider.");
}
