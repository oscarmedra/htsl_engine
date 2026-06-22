/**
 * Tabs runtime: click navigation for `{@tabs}` blocks.
 *
 * Pure DOM, no external dependency. The active tab index lives in the block's
 * `data-htsl-tab` attribute (morph-safe), and the global click listener is
 * installed once per window. The document content never produces a `<script>`.
 */

interface TabsWindow {
  document: Document;
  __htslTabsWired?: boolean;
}

const TABS = ".htsl-tabs[data-htsl-tabs]";

function tabsBlocks(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABS));
}

/** Blocks not yet hydrated (used by the playground to detect pending work). */
export function pendingTabs(root: ParentNode): Element[] {
  return tabsBlocks(root).filter((b) => !b.hasAttribute("data-htsl-tabs-ready"));
}

/** Reflect `data-htsl-tab` into the visible state (active button + panel). */
function applyState(block: HTMLElement): void {
  const buttons = Array.from(block.querySelectorAll<HTMLElement>(".htsl-tabs-bar > .htsl-tab-btn"));
  const panels = Array.from(block.querySelectorAll<HTMLElement>(".htsl-tabs-panels > .htsl-tab-panel"));
  const n = Math.min(buttons.length, panels.length);
  let i = Number(block.getAttribute("data-htsl-tab") ?? "0");
  if (!Number.isFinite(i)) i = 0;
  i = Math.max(0, Math.min(i, Math.max(0, n - 1)));
  block.setAttribute("data-htsl-tab", String(i));
  block.classList.add("htsl-tabs--ready");
  buttons.forEach((b, k) => {
    b.classList.toggle("is-active", k === i);
    b.setAttribute("aria-selected", k === i ? "true" : "false");
  });
  panels.forEach((p, k) => p.classList.toggle("is-active", k === i));
}

function wireOnce(win: TabsWindow): void {
  if (win.__htslTabsWired) return;
  win.__htslTabsWired = true;
  win.document.addEventListener("click", (e) => {
    const btn = (e.target as Element | null)?.closest?.(".htsl-tab-btn");
    const block = btn?.closest?.(".htsl-tabs") as HTMLElement | null;
    if (!btn || !block) return;
    const to = Number(btn.getAttribute("data-htsl-tab-to") ?? "0");
    block.setAttribute("data-htsl-tab", String(to));
    applyState(block);
  });
}

/** Hydrate every tabs block under `root`. Idempotent and morph-safe. */
export function hydrateTabs(root?: ParentNode, win?: TabsWindow): number {
  const w = win ?? (globalThis as unknown as { window?: TabsWindow }).window;
  const scope = root ?? w?.document;
  if (!scope) return 0;
  if (w) wireOnce(w);
  let count = 0;
  for (const block of tabsBlocks(scope)) {
    applyState(block);
    if (!block.hasAttribute("data-htsl-tabs-ready")) {
      block.setAttribute("data-htsl-tabs-ready", "");
      count += 1;
    }
  }
  return count;
}

/** Tabs are pure DOM (state in attributes); nothing external to free. */
export function purgeTabs(): void {
  /* no-op — kept for API symmetry */
}
