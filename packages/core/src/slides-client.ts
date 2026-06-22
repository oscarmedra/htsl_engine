/**
 * Slide-deck runtime: button / keyboard navigation for `{@slide}` decks.
 *
 * Pure DOM — no external dependency. The current slide lives in the deck's
 * `data-htsl-index` attribute (so it survives morphdom updates), and the global
 * click/keydown listeners are installed **once per window**. This is the engine's
 * own trusted JS: the document content never produces a `<script>`.
 */

interface SlidesWindow {
  document: Document;
  __htslDeckWired?: boolean;
}

const DECK = ".htsl-deck[data-htsl-slides]";

function decks(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(DECK));
}

/** Decks not yet hydrated (used by the playground to decide if work is pending). */
export function pendingSlides(root: ParentNode): Element[] {
  return decks(root).filter((d) => !d.hasAttribute("data-htsl-deck-ready"));
}

function slidesOf(deck: Element): HTMLElement[] {
  return Array.from(deck.querySelectorAll<HTMLElement>(".htsl-deck-stage > section"));
}

/** Reflect `data-htsl-index` into the visible state (active slide, counter, bar). */
function applyState(deck: HTMLElement): void {
  const slides = slidesOf(deck);
  const n = slides.length;
  let i = Number(deck.getAttribute("data-htsl-index") ?? "0");
  if (!Number.isFinite(i)) i = 0;
  i = Math.max(0, Math.min(i, Math.max(0, n - 1)));
  deck.setAttribute("data-htsl-index", String(i));
  deck.classList.add("htsl-deck--ready");
  slides.forEach((s, k) => s.classList.toggle("is-active", k === i));

  const counter = deck.querySelector(".htsl-deck-counter");
  if (counter) counter.textContent = `${n ? i + 1 : 0} / ${n}`;
  const fill = deck.querySelector<HTMLElement>(".htsl-deck-fill");
  if (fill) fill.style.width = n > 1 ? `${(i / (n - 1)) * 100}%` : n ? "100%" : "0";
  (deck.querySelector(".htsl-deck-prev") as HTMLButtonElement | null)?.toggleAttribute(
    "disabled",
    i <= 0,
  );
  (deck.querySelector(".htsl-deck-next") as HTMLButtonElement | null)?.toggleAttribute(
    "disabled",
    i >= n - 1,
  );
}

function go(deck: HTMLElement, delta: number): void {
  deck.setAttribute("data-htsl-index", String(Number(deck.getAttribute("data-htsl-index") ?? "0") + delta));
  applyState(deck);
}

function toggleFullscreen(deck: HTMLElement): void {
  const doc = deck.ownerDocument as Document & { exitFullscreen?: () => Promise<void> };
  if (doc.fullscreenElement) void doc.exitFullscreen?.();
  else void (deck.requestFullscreen?.() as Promise<void> | undefined)?.catch(() => undefined);
}

function closestDeck(el: EventTarget | null): HTMLElement | null {
  return (el as Element | null)?.closest?.(".htsl-deck") as HTMLElement | null;
}

function wireOnce(win: SlidesWindow): void {
  if (win.__htslDeckWired) return;
  win.__htslDeckWired = true;
  const doc = win.document;

  doc.addEventListener("click", (e) => {
    const btn = (e.target as Element | null)?.closest?.(
      ".htsl-deck-prev, .htsl-deck-next, .htsl-deck-full",
    );
    const deck = closestDeck(btn ?? null);
    if (!btn || !deck) return;
    if (btn.classList.contains("htsl-deck-full")) toggleFullscreen(deck);
    else go(deck, btn.classList.contains("htsl-deck-next") ? 1 : -1);
  });

  doc.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const deck = closestDeck(doc.activeElement);
    if (!deck) return;
    e.preventDefault();
    go(deck, e.key === "ArrowRight" ? 1 : -1);
  });
}

/** Hydrate every slide deck under `root`. Idempotent and morph-safe. */
export function hydrateSlides(root?: ParentNode, win?: SlidesWindow): number {
  const w = win ?? (globalThis as unknown as { window?: SlidesWindow }).window;
  const scope = root ?? w?.document;
  if (!scope) return 0;
  if (w) wireOnce(w);
  let count = 0;
  for (const deck of decks(scope)) {
    applyState(deck);
    if (!deck.hasAttribute("data-htsl-deck-ready")) {
      deck.setAttribute("data-htsl-deck-ready", "");
      count += 1;
    }
  }
  return count;
}

/** Decks are pure DOM (state in attributes); nothing external to free. */
export function purgeSlides(): void {
  /* no-op — kept for API symmetry with scenes/three */
}
