/**
 * Slide-deck runtime: button / keyboard navigation for `{@slider}` decks, plus
 * optional **auto-advance** (attribute `data-htsl-autoplay` in ms, `data-htsl-loop`).
 *
 * Pure DOM — no external dependency. The current slide lives in the deck's
 * `data-htsl-index` attribute (so it survives morphdom updates), and the global
 * click/keydown listeners are installed **once per window**. This is the engine's
 * own trusted JS: the document content never produces a `<script>`.
 */

interface SlidesWindow {
  document: Document;
  __htslDeckWired?: boolean;
  setInterval?: (fn: () => void, ms: number) => number;
  clearInterval?: (id: number) => void;
  matchMedia?: (q: string) => { matches: boolean };
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

/* -------------------------------------------------------------------------- */
/* Auto-advance                                                                */
/* -------------------------------------------------------------------------- */

interface DeckAuto {
  ms: number;
  loop: boolean;
  playing: boolean;
  id: number;
}
const AUTO = new WeakMap<HTMLElement, DeckAuto>();

function reducedMotion(win: SlidesWindow): boolean {
  try {
    return !!win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Reflect the playing state on the deck + swap the ▶ / ⏸ button icon. */
function reflectPlaying(deck: HTMLElement, playing: boolean): void {
  deck.toggleAttribute("data-htsl-playing", playing);
  const b = deck.querySelector<HTMLElement>(".htsl-deck-play");
  if (b) {
    b.innerHTML = playing ? "&#9208;" : "&#9654;"; // ⏸ / ▶
    b.setAttribute("aria-label", playing ? "Pause" : "Lecture");
  }
}

/** Fill the progress bar from 0→100 % over `ms` as a visible countdown. */
function restartCountdown(deck: HTMLElement, ms: number): void {
  const fill = deck.querySelector<HTMLElement>(".htsl-deck-fill");
  if (!fill) return;
  fill.style.transition = "none";
  fill.style.width = "0%";
  void fill.offsetWidth; // force reflow so the next transition animates
  fill.style.transition = `width ${ms}ms linear`;
  fill.style.width = "100%";
}

function stopCountdown(deck: HTMLElement): void {
  const fill = deck.querySelector<HTMLElement>(".htsl-deck-fill");
  if (fill) {
    fill.style.transition = "";
    fill.style.width = "";
  }
}

function startAuto(deck: HTMLElement, win: SlidesWindow): void {
  const s = AUTO.get(deck);
  if (!s || s.playing || s.ms <= 0 || !win.setInterval) return;
  s.playing = true;
  reflectPlaying(deck, true);
  restartCountdown(deck, s.ms);
  s.id = win.setInterval(() => tickAuto(deck, win), s.ms);
}

function stopAuto(deck: HTMLElement, win: SlidesWindow): void {
  const s = AUTO.get(deck);
  if (!s || !s.playing) return;
  s.playing = false;
  reflectPlaying(deck, false);
  win.clearInterval?.(s.id);
  stopCountdown(deck);
  applyState(deck); // restore the position-based progress bar
}

function tickAuto(deck: HTMLElement, win: SlidesWindow): void {
  const s = AUTO.get(deck);
  const n = slidesOf(deck).length;
  const i = Number(deck.getAttribute("data-htsl-index") ?? "0");
  if (i >= n - 1) {
    if (s?.loop) deck.setAttribute("data-htsl-index", "0");
    else return stopAuto(deck, win);
  } else {
    deck.setAttribute("data-htsl-index", String(i + 1));
  }
  applyState(deck);
  if (s?.playing) restartCountdown(deck, s.ms);
}

/* -------------------------------------------------------------------------- */
/* State                                                                       */
/* -------------------------------------------------------------------------- */

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
  // While auto-playing, the fill doubles as the countdown bar — leave it alone.
  const fill = deck.querySelector<HTMLElement>(".htsl-deck-fill");
  if (fill && !AUTO.get(deck)?.playing) {
    fill.style.width = n > 1 ? `${(i / (n - 1)) * 100}%` : n ? "100%" : "0";
  }
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
      ".htsl-deck-prev, .htsl-deck-next, .htsl-deck-full, .htsl-deck-play",
    );
    const deck = closestDeck(btn ?? null);
    if (!btn || !deck) return;
    if (btn.classList.contains("htsl-deck-play")) {
      if (AUTO.get(deck)?.playing) stopAuto(deck, win);
      else startAuto(deck, win);
    } else if (btn.classList.contains("htsl-deck-full")) {
      toggleFullscreen(deck);
    } else {
      stopAuto(deck, win); // manual navigation pauses auto-advance
      go(deck, btn.classList.contains("htsl-deck-next") ? 1 : -1);
    }
  });

  doc.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const deck = closestDeck(doc.activeElement);
    if (!deck) return;
    e.preventDefault();
    stopAuto(deck, win); // manual navigation pauses auto-advance
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
      const ms = Number(deck.getAttribute("data-htsl-autoplay") ?? "0");
      if (ms > 0 && w) {
        AUTO.set(deck, { ms, loop: deck.hasAttribute("data-htsl-loop"), playing: false, id: 0 });
        reflectPlaying(deck, false);
        if (!reducedMotion(w)) startAuto(deck, w); // auto-start unless reduced motion
      }
    }
  }
  return count;
}

/** Decks are pure DOM (state in attributes); nothing external to free. */
export function purgeSlides(): void {
  /* no-op — kept for API symmetry with scenes/three */
}
