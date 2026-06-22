/**
 * Default stylesheet for math objects, following common scientific-document
 * conventions: centered display blocks, right-aligned equation numbers, and a
 * monospaced fallback when KaTeX is not available.
 *
 * Inject `mathCss` into a <style> tag (it is also shipped with the demo page).
 */
export const mathCss = `
.htsl-math-inline { display: inline-block; }
.htsl-math-block {
  display: block;
  text-align: center;
  margin: 0.75em 0;
  overflow-x: auto;
}
.htsl-math-equation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1em;
  position: relative;
  margin: 0.75em 0;
}
.htsl-math-equation .htsl-math-body {
  flex: 1 1 auto;
  text-align: center;
}
.htsl-math-equation .htsl-eqn-number {
  flex: 0 0 auto;
  margin-left: auto;
  color: #444;
  font-variant-numeric: tabular-nums;
}
.htsl-math-ref {
  color: #1d4ed8;
  text-decoration: none;
}
.htsl-math-ref:hover { text-decoration: underline; }
.htsl-math-raw {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: #f4f4f5;
  padding: 0.05em 0.35em;
  border-radius: 4px;
  white-space: pre-wrap;
}
.htsl-scene {
  display: block;
  margin: 0.75em auto;
  max-width: 100%;
}
.htsl-scene-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 120px;
  color: #71717a;
  font-size: 0.9em;
  border: 1px dashed #d4d4d8;
  border-radius: 8px;
  padding: 1em;
  text-align: center;
}

/* Slide decks ({@slide: {section:…}}). */
.htsl-deck {
  position: relative;
  border: 1px solid #e3e6ea;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  outline: none;
  box-shadow: 0 6px 24px rgba(15, 23, 42, 0.06);
  margin: 1em 0;
}
.htsl-deck-progress { height: 4px; background: #eef2ff; }
.htsl-deck-fill { display: block; height: 100%; width: 0; background: #3b5bdb; transition: width 0.25s ease; }
.htsl-deck-stage { padding: 1.6rem 1.8rem; }
.htsl-deck-stage > section { display: none; animation: htsl-slide-in 0.28s ease; }
/* Graceful without the runtime: show the first slide. With it: only the active one. */
.htsl-deck:not(.htsl-deck--ready) .htsl-deck-stage > section:first-child { display: block; }
.htsl-deck.htsl-deck--ready .htsl-deck-stage > section.is-active { display: block; }
@keyframes htsl-slide-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.htsl-deck-nav {
  display: flex; align-items: center; justify-content: center; gap: 0.9rem;
  padding: 0.6rem; border-top: 1px solid #eef0f3; background: #fbfbfc;
}
.htsl-deck-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.1rem; height: 2.1rem; border-radius: 9px;
  border: 1px solid #e3e6ea; background: #fff; color: #3b5bdb;
  font-size: 1.15rem; line-height: 1; cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.05s;
}
.htsl-deck-btn:hover { background: #eef2ff; border-color: #3b5bdb; }
.htsl-deck-btn:active { transform: translateY(1px); }
.htsl-deck-btn:disabled { opacity: 0.4; cursor: default; }
.htsl-deck-counter { font: 500 0.85rem/1 ui-monospace, monospace; color: #6b7280; min-width: 3.2rem; text-align: center; }
.htsl-deck:fullscreen { border-radius: 0; display: flex; flex-direction: column; }
.htsl-deck:fullscreen .htsl-deck-stage { flex: 1; display: flex; flex-direction: column; justify-content: center; }
@media print {
  .htsl-deck-nav, .htsl-deck-progress { display: none; }
  .htsl-deck-stage > section { display: block !important; break-after: page; padding: 0.5em 0; }
}
`.trim();
