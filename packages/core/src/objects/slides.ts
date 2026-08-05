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

/** Slide transition effects (attribute `transition`). Unknown → "none". */
const SLIDE_TRANSITIONS = new Set(["none", "fade", "slide", "zoom"]);

export function deckTransition(raw: string | undefined): string {
  const t = (raw ?? "").trim().toLowerCase();
  return SLIDE_TRANSITIONS.has(t) ? t : "none";
}

/**
 * Parse an auto-advance duration into milliseconds. Accepts a bare number
 * (seconds) or a `ms` / `s` / `m` suffix: `"8"`/`"8s"` → 8000, `"2m"` → 120000,
 * `"500ms"` → 500. Anything invalid or ≤ 0 → 0 (autoplay off).
 */
export function parseDurationMs(raw: string | undefined): number {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(ms|s|m)?\s*$/i.exec(raw ?? "");
  if (!m) return 0;
  const unit = (m[2] ?? "s").toLowerCase();
  const factor = unit === "ms" ? 1 : unit === "m" ? 60_000 : 1000;
  const ms = Math.round(parseFloat(m[1]!) * factor);
  return ms > 0 ? ms : 0;
}
