/**
 * Book-reader runtime for `{@document[mode=book]:}`: turns the stack of
 * `{@page}` sheets into a page-by-page flip reader, so on screen it feels like
 * leafing through a real book. Print is untouched — the paged CSS still lays
 * every page onto its own sheet.
 *
 * Pure DOM, no external dependency. The current page lives in the container's
 * `data-htsl-book-index` attribute (so it survives morphdom updates), and the
 * global click / keydown listeners are installed **once per window**. This is
 * the engine's own trusted JS: document content never emits a `<script>`.
 */

interface BookWindow {
  document: Document;
  __htslBookWired?: boolean;
}

const BOOK = ".htsl-doc--book[data-htsl-book]";

function books(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(BOOK));
}

/** Books not yet hydrated (used by the playground to decide if work is pending). */
export function pendingBooks(root: ParentNode): Element[] {
  return books(root).filter((b) => !b.hasAttribute("data-htsl-book-ready"));
}

function pagesOf(book: Element): HTMLElement[] {
  return Array.from(book.querySelectorAll<HTMLElement>(".htsl-book-stage > .htsl-doc-page"));
}

/** Reflect `data-htsl-book-index` into the visible state (current page, counter). */
function applyState(book: HTMLElement): void {
  const pages = pagesOf(book);
  const n = pages.length;
  let i = Number(book.getAttribute("data-htsl-book-index") ?? "0");
  if (!Number.isFinite(i)) i = 0;
  i = Math.max(0, Math.min(i, Math.max(0, n - 1)));
  book.setAttribute("data-htsl-book-index", String(i));
  pages.forEach((p, k) => p.classList.toggle("is-current", k === i));

  const counter = book.querySelector(".htsl-book-counter");
  if (counter) counter.textContent = `${n ? i + 1 : 0} / ${n}`;
  (book.querySelector(".htsl-book-prev") as HTMLButtonElement | null)?.toggleAttribute(
    "disabled",
    i <= 0,
  );
  (book.querySelector(".htsl-book-next") as HTMLButtonElement | null)?.toggleAttribute(
    "disabled",
    i >= n - 1,
  );
}

/** Play the page-turn animation on the now-current page — only on a real turn,
 *  never on a re-render (so editing a book doesn't re-trigger it every keystroke). */
function animateTurn(book: HTMLElement, forward: boolean): void {
  const cur = book.querySelector<HTMLElement>(".htsl-book-stage > .htsl-doc-page.is-current");
  if (!cur) return;
  cur.classList.remove("htsl-book-turn-next", "htsl-book-turn-prev");
  void cur.offsetWidth; // reflow → restart the CSS animation from scratch
  cur.classList.add(forward ? "htsl-book-turn-next" : "htsl-book-turn-prev");
}

function go(book: HTMLElement, delta: number): void {
  const before = Number(book.getAttribute("data-htsl-book-index") ?? "0");
  book.setAttribute("data-htsl-book-index", String(before + delta));
  applyState(book);
  const after = Number(book.getAttribute("data-htsl-book-index") ?? "0");
  if (after !== before) animateTurn(book, after > before);
}

function closestBook(el: EventTarget | null): HTMLElement | null {
  return (el as Element | null)?.closest?.(".htsl-doc--book") as HTMLElement | null;
}

function wireOnce(win: BookWindow): void {
  if (win.__htslBookWired) return;
  win.__htslBookWired = true;
  const doc = win.document;

  doc.addEventListener("click", (e) => {
    const btn = (e.target as Element | null)?.closest?.(".htsl-book-prev, .htsl-book-next");
    const book = closestBook(btn ?? null);
    if (!btn || !book) return;
    go(book, btn.classList.contains("htsl-book-next") ? 1 : -1);
  });

  doc.addEventListener("keydown", (e) => {
    const ev = e as KeyboardEvent;
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    const book = closestBook(doc.activeElement);
    if (!book) return;
    ev.preventDefault();
    go(book, ev.key === "ArrowRight" ? 1 : -1);
  });
}

/** Hydrate every book under `root`. Idempotent and morph-safe. */
export function hydrateBooks(root?: ParentNode, win?: BookWindow): number {
  const w = win ?? (globalThis as unknown as { window?: BookWindow }).window;
  const scope = root ?? w?.document;
  if (!scope) return 0;
  if (w) wireOnce(w);
  let count = 0;
  for (const book of books(scope)) {
    applyState(book);
    if (!book.hasAttribute("data-htsl-book-ready")) {
      book.setAttribute("data-htsl-book-ready", "");
      count += 1;
    }
  }
  return count;
}

/** Books are pure DOM (state in attributes); nothing external to free. */
export function purgeBooks(): void {
  /* no-op — kept for API symmetry with scenes/three */
}
