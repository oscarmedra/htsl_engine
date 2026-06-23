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

/* Semantic callouts ({@theorem}, {@definition}, {@proof}…). */
.htsl-callout {
  border: 1px solid #e3e6ea;
  border-left: 4px solid #94a3b8;
  border-radius: 8px;
  background: #fff;
  margin: 1em 0;
  overflow: hidden;
  break-inside: avoid;
}
.htsl-callout-head {
  font-weight: 600; font-size: 0.92em;
  padding: 0.5em 0.9em;
  background: #f8fafc; border-bottom: 1px solid #eef0f3; color: #334155;
}
.htsl-callout-body { padding: 0.7em 0.9em; }
.htsl-callout-body > :first-child { margin-top: 0; }
.htsl-callout-body > :last-child { margin-bottom: 0; }
.htsl-callout-theorem { border-left-color: #3b5bdb; }
.htsl-callout-theorem .htsl-callout-head { background: #eef2ff; color: #3730a3; }
.htsl-callout-definition { border-left-color: #7c3aed; }
.htsl-callout-definition .htsl-callout-head { background: #f5f3ff; color: #5b21b6; }
.htsl-callout-property { border-left-color: #0d9488; }
.htsl-callout-property .htsl-callout-head { background: #f0fdfa; color: #0f766e; }
.htsl-callout-example { border-left-color: #16a34a; }
.htsl-callout-example .htsl-callout-head { background: #f0fdf4; color: #15803d; }
.htsl-callout-proof { border-left-color: #94a3b8; }
.htsl-callout-proof .htsl-callout-head { background: #f8fafc; color: #475569; font-style: italic; }
.htsl-callout-proof .htsl-callout-body::after { content: " ∎"; color: #94a3b8; }
.htsl-callout-remark { border-left-color: #64748b; }
.htsl-callout-remark .htsl-callout-head { background: #f8fafc; color: #475569; }
.htsl-callout-warning { border-left-color: #d97706; }
.htsl-callout-warning .htsl-callout-head { background: #fffbeb; color: #b45309; }
.htsl-ref { color: #3b5bdb; text-decoration: none; border-bottom: 1px dotted #93a4f4; }
.htsl-ref:hover { border-bottom-style: solid; }
.htsl-ref-broken { color: #c92a2a; border-bottom: none; }

/* Reveal ({@reveal}) — native <details>, zero JS. */
.htsl-reveal { border: 1px solid #e3e6ea; border-radius: 8px; margin: 1em 0; background: #fff; overflow: hidden; }
.htsl-reveal-summary {
  cursor: pointer; list-style: none; user-select: none;
  padding: 0.55em 0.9em; font-weight: 600; font-size: 0.92em; color: #3b5bdb; background: #f8fafc;
}
.htsl-reveal-summary::-webkit-details-marker { display: none; }
.htsl-reveal-summary::before { content: "▸ "; color: #94a3b8; }
.htsl-reveal[open] .htsl-reveal-summary::before { content: "▾ "; }
.htsl-reveal[open] .htsl-reveal-summary { border-bottom: 1px solid #eef0f3; }
.htsl-reveal-body { padding: 0.7em 0.9em; }
.htsl-reveal-body > :first-child { margin-top: 0; }
.htsl-reveal-body > :last-child { margin-bottom: 0; }

/* Tabs ({@tabs}) — hydrated by the runtime. */
.htsl-tabs { border: 1px solid #e3e6ea; border-radius: 10px; margin: 1em 0; background: #fff; overflow: hidden; }
.htsl-tabs-bar { display: flex; flex-wrap: wrap; gap: 0.15rem; padding: 0.3rem 0.3rem 0; background: #f8fafc; border-bottom: 1px solid #eef0f3; }
.htsl-tab-btn {
  border: none; background: transparent; cursor: pointer;
  padding: 0.45em 0.85em; border-radius: 8px 8px 0 0;
  font-size: 0.9em; color: #64748b; border-bottom: 2px solid transparent;
}
.htsl-tab-btn:hover { color: #334155; background: #eef2ff; }
.htsl-tab-btn.is-active { color: #3b5bdb; font-weight: 600; background: #fff; border-bottom-color: #3b5bdb; }
.htsl-tab-panel { display: none; padding: 0.8em 0.95em; }
/* Graceful without the runtime: show the first panel. With it: only the active one. */
.htsl-tabs:not(.htsl-tabs--ready) .htsl-tab-panel:first-child { display: block; }
.htsl-tabs.htsl-tabs--ready .htsl-tab-panel.is-active { display: block; }
.htsl-tab-panel > :first-child { margin-top: 0; }
.htsl-tab-panel > :last-child { margin-bottom: 0; }
@media print { .htsl-tab-panel { display: block !important; } .htsl-tabs-bar { display: none; } }

/* Quiz ({@quiz}) — graded by the runtime. */
.htsl-quiz { border: 1px solid #e3e6ea; border-radius: 10px; margin: 1em 0; padding: 0.9em 1em; background: #fff; }
.htsl-quiz-q { font-weight: 600; margin-bottom: 0.7em; }
.htsl-quiz-opts { display: flex; flex-direction: column; gap: 0.4rem; }
.htsl-quiz-opt {
  text-align: left; cursor: pointer;
  border: 1px solid #e3e6ea; border-radius: 8px; background: #f8fafc;
  padding: 0.55em 0.8em; font: inherit; color: inherit;
  transition: background 0.12s, border-color 0.12s;
}
.htsl-quiz-opt:hover:not([disabled]) { background: #eef2ff; border-color: #93a4f4; }
.htsl-quiz-opt[disabled] { cursor: default; }
.htsl-quiz-opt.is-correct { background: #f0fdf4; border-color: #16a34a; color: #15803d; }
.htsl-quiz-opt.is-correct::after { content: " ✓"; font-weight: 700; }
.htsl-quiz-opt.is-wrong { background: #fff0f0; border-color: #dc2626; color: #b91c1c; }
.htsl-quiz-opt.is-wrong::after { content: " ✗"; font-weight: 700; }
.htsl-quiz-explain { margin-top: 0.7em; padding: 0.55em 0.8em; background: #f8fafc; border-left: 3px solid #3b5bdb; border-radius: 0 6px 6px 0; font-size: 0.95em; }

/* Flashcard ({@flashcard}) — pure CSS flip (checkbox + label). */
.htsl-flashcard { perspective: 1000px; margin: 1em 0; max-width: 22rem; }
.htsl-fc-toggle { position: absolute; opacity: 0; width: 0; height: 0; }
.htsl-fc-inner {
  position: relative; display: block; min-height: 8rem; cursor: pointer;
  transform-style: preserve-3d; transition: transform 0.5s;
}
.htsl-fc-toggle:checked + .htsl-fc-inner { transform: rotateY(180deg); }
.htsl-fc-toggle:focus-visible + .htsl-fc-inner { outline: 2px solid #3b5bdb; outline-offset: 3px; border-radius: 12px; }
.htsl-fc-face {
  position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden;
  display: flex; align-items: center; justify-content: center; text-align: center;
  padding: 1em; border: 1px solid #e3e6ea; border-radius: 12px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}
.htsl-fc-front { background: #fff; }
.htsl-fc-back { background: #eef2ff; transform: rotateY(180deg); }
.htsl-fc-inner::after {
  content: "↻"; position: absolute; right: 0.6em; bottom: 0.4em;
  color: #94a3b8; font-size: 0.9em; backface-visibility: hidden;
}
@media print {
  .htsl-fc-inner { min-height: auto; }
  .htsl-fc-face { position: static; backface-visibility: visible; transform: none; margin-bottom: 0.4em; }
  .htsl-fc-inner::after { display: none; }
}

/* Variation / sign tables ({@variations}, {@signs}) — pure CSS grid. */
.htsl-vt { overflow-x: auto; margin: 1em 0; }
.htsl-vt-grid {
  display: grid; align-items: stretch; min-width: max-content;
  border: 1px solid #cbd5e1; border-radius: 8px; background: #fff;
}
.htsl-vt-cell { border-right: 1px solid #e2e8f0; padding: 0.3em 0.5em; text-align: center; }
.htsl-vt-r1 { background: #f8fafc; border-bottom: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; }
.htsl-vt-label { font-weight: 600; display: flex; align-items: center; justify-content: center; }
.htsl-vt-val { min-height: 3.6rem; display: flex; justify-content: center; }
.htsl-vt-val.htsl-vt-top { align-items: flex-start; }
.htsl-vt-val.htsl-vt-bottom { align-items: flex-end; }
.htsl-vt-arrow { min-height: 3.6rem; display: flex; align-items: center; justify-content: center; font-size: 1.7rem; line-height: 1; color: #3b5bdb; }
.htsl-vt-sign { display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.htsl-vt-zero { color: #64748b; }

/* Interactive parameter ({@param}) — slider; the runtime re-samples plots live. */
.htsl-param {
  display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;
  margin: 0.6em 0; padding: 0.5em 0.8em;
  border: 1px solid #e3e6ea; border-radius: 8px; background: #f8fafc;
}
.htsl-param-label { font-family: ui-monospace, monospace; font-size: 0.95em; color: #1f2430; white-space: nowrap; }
.htsl-param-value { font-weight: 700; color: #3b5bdb; }
.htsl-param-range { flex: 1; min-width: 8rem; accent-color: #3b5bdb; cursor: pointer; }
`.trim();
