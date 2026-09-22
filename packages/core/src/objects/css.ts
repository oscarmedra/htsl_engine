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
/* Only the active slide is shown; it plays an entrance animation chosen by the
   transition attribute (fade / slide / zoom). Keyframe animations run reliably
   whatever the previous display state — no cross-fade fragility. */
.htsl-deck-stage > section { display: none; }
.htsl-deck:not(.htsl-deck--ready) .htsl-deck-stage > section:first-child { display: block; }
.htsl-deck.htsl-deck--ready .htsl-deck-stage > section.is-active { display: block; }
/* The entrance animation runs ONLY on a real slide change: the runtime adds
   .htsl-slide-enter to the newly-active slide (never on a re-render), so editing
   inside a deck no longer replays the animation on every keystroke. */
.htsl-deck[data-htsl-transition="fade"] .htsl-deck-stage > section.htsl-slide-enter { animation: htsl-fade 0.35s ease; }
.htsl-deck[data-htsl-transition="slide"] .htsl-deck-stage > section.htsl-slide-enter { animation: htsl-slidein 0.35s ease; }
.htsl-deck[data-htsl-transition="zoom"] .htsl-deck-stage > section.htsl-slide-enter { animation: htsl-zoomin 0.32s ease; }
@keyframes htsl-fade { from { opacity: 0; } }
@keyframes htsl-slidein { from { opacity: 0; transform: translateX(30px); } }
@keyframes htsl-zoomin { from { opacity: 0; transform: scale(0.96); } }
@media (prefers-reduced-motion: reduce) {
  .htsl-deck-stage > section.htsl-slide-enter { animation: none !important; }
}
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
  .htsl-deck-stage > section {
    display: block !important; animation: none !important; break-after: page; padding: 0.5em 0;
  }
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
/* Theorem-like family (blues). */
.htsl-callout-proposition { border-left-color: #2563eb; }
.htsl-callout-proposition .htsl-callout-head { background: #eff6ff; color: #1e40af; }
.htsl-callout-lemma { border-left-color: #0284c7; }
.htsl-callout-lemma .htsl-callout-head { background: #f0f9ff; color: #075985; }
.htsl-callout-corollary { border-left-color: #4f46e5; }
.htsl-callout-corollary .htsl-callout-head { background: #eef2ff; color: #3730a3; }
.htsl-callout-conjecture { border-left-color: #c026d3; }
.htsl-callout-conjecture .htsl-callout-head { background: #fdf4ff; color: #a21caf; }
.htsl-callout-claim { border-left-color: #0891b2; }
.htsl-callout-claim .htsl-callout-head { background: #ecfeff; color: #155e75; }
/* Foundations (purples). */
.htsl-callout-axiom { border-left-color: #9333ea; }
.htsl-callout-axiom .htsl-callout-head { background: #faf5ff; color: #6b21a8; }
.htsl-callout-hypothesis { border-left-color: #db2777; }
.htsl-callout-hypothesis .htsl-callout-head { background: #fdf2f8; color: #9d174d; }
.htsl-callout-notation { border-left-color: #a78bfa; }
.htsl-callout-notation .htsl-callout-head { background: #f5f3ff; color: #6d28d9; }
/* Constructions & procedures. */
.htsl-callout-construction { border-left-color: #ca8a04; }
.htsl-callout-construction .htsl-callout-head { background: #fefce8; color: #a16207; }
.htsl-callout-algorithm { border-left-color: #475569; }
.htsl-callout-algorithm .htsl-callout-head { background: #f1f5f9; color: #1e293b; font-family: ui-monospace, monospace; }
.htsl-callout-observation { border-left-color: #059669; }
.htsl-callout-observation .htsl-callout-head { background: #ecfdf5; color: #047857; }
.htsl-ref { color: #3b5bdb; text-decoration: none; border-bottom: 1px dotted #93a4f4; }
.htsl-ref:hover { border-bottom-style: solid; }
.htsl-ref-broken { color: #c92a2a; border-bottom: none; }

/* Neutral box ({@panel}) — no label/number; the color attribute picks the accent. */
.htsl-panel {
  margin: 1em 0; padding: 0.8em 1em; border-radius: 10px;
  border: 1px solid var(--pc-border, #e2e8f0);
  background: var(--pc-bg, #f8fafc);
}
.htsl-panel-title { font-weight: 700; margin-bottom: 0.3em; color: var(--pc-accent, #334155); }
.htsl-panel-body > :first-child { margin-top: 0; }
.htsl-panel-body > :last-child { margin-bottom: 0; }
/* Shared accent palette for {@panel} and {@badge}. */
.htsl-panel--slate,  .htsl-badge--slate  { --pc-accent: #64748b; --pc-bg: #f1f5f9; --pc-border: #e2e8f0; }
.htsl-panel--indigo, .htsl-badge--indigo { --pc-accent: #4f46e5; --pc-bg: #eef2ff; --pc-border: #c7d2fe; }
.htsl-panel--blue,   .htsl-badge--blue   { --pc-accent: #2563eb; --pc-bg: #eff6ff; --pc-border: #bfdbfe; }
.htsl-panel--green,  .htsl-badge--green  { --pc-accent: #16a34a; --pc-bg: #f0fdf4; --pc-border: #bbf7d0; }
.htsl-panel--red,    .htsl-badge--red    { --pc-accent: #dc2626; --pc-bg: #fef2f2; --pc-border: #fecaca; }
.htsl-panel--amber,  .htsl-badge--amber  { --pc-accent: #d97706; --pc-bg: #fffbeb; --pc-border: #fde68a; }
.htsl-panel--violet, .htsl-badge--violet { --pc-accent: #7c3aed; --pc-bg: #f5f3ff; --pc-border: #ddd6fe; }
.htsl-panel--teal,   .htsl-badge--teal   { --pc-accent: #0d9488; --pc-bg: #f0fdfa; --pc-border: #99f6e4; }

/* Numbered steps ({@stepper: {@step:…}}) — each step is a bordered box with a
   small "Étape N" label tab sitting on its top edge (like a fieldset legend). */
.htsl-stepper { margin: 1em 0; }
.htsl-step {
  position: relative;
  margin: 1.4rem 0;
  padding: 1.1rem 1rem 0.9rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
}
.htsl-step-label {
  position: absolute; top: -0.72rem; left: 0.9rem;
  padding: 0.12rem 0.6rem;
  background: #fff;
  border: 1.5px solid #cbd5e1; border-radius: 7px;
  font-size: 0.8rem; font-weight: 600; color: #475569;
}
.htsl-step-body > :first-child { margin-top: 0; }
.htsl-step-body > :last-child { margin-bottom: 0; }

/* Columns ({@columns: {@col:…}}) — side by side, stacked on narrow screens. */
.htsl-columns { display: grid; grid-template-columns: repeat(var(--htsl-cols, 2), 1fr); gap: 1rem; margin: 1em 0; }
.htsl-col { min-width: 0; }
.htsl-col > :first-child { margin-top: 0; }
.htsl-col > :last-child { margin-bottom: 0; }
@media (max-width: 640px) { .htsl-columns { grid-template-columns: 1fr; } }

/* Definition list / glossary ({@deflist}). */
.htsl-deflist { margin: 1em 0; display: grid; grid-template-columns: max-content 1fr; gap: 0.35em 1em; }
.htsl-deflist dt { font-weight: 600; color: #334155; }
.htsl-deflist dd { margin: 0; color: #475569; }

/* Timeline ({@timeline: {@event[date=…]:…}}) — vertical line + dots. */
.htsl-timeline { margin: 1em 0; padding-left: 0.4rem; }
.htsl-tl-event { display: grid; grid-template-columns: auto 1fr; gap: 0.8rem; position: relative; padding-bottom: 1.1rem; }
.htsl-tl-event:last-child { padding-bottom: 0; }
.htsl-tl-event:not(:last-child)::before {
  content: ""; position: absolute; left: 0.34rem; top: 0.9rem; bottom: -0.1rem; width: 2px; background: #e3e6ea;
}
.htsl-tl-dot { width: 0.72rem; height: 0.72rem; border-radius: 50%; background: #3b5bdb; margin-top: 0.35rem; position: relative; z-index: 1; box-shadow: 0 0 0 3px #eef2ff; }
.htsl-tl-date { font-family: ui-monospace, monospace; font-size: 0.78rem; font-weight: 700; color: #3b5bdb; }
.htsl-tl-body > :first-child { margin-top: 0.1rem; }
.htsl-tl-body > :last-child { margin-bottom: 0; }

/* Highlighter ({@mark}). */
.htsl-mark { background: #fef08a; padding: 0.05em 0.15em; border-radius: 3px; }

/* Inline badge / pill ({@badge}, {@pill}). */
.htsl-badge {
  display: inline-block; padding: 0.05em 0.55em; border-radius: 999px;
  font-size: 0.78em; font-weight: 600; line-height: 1.5;
  background: var(--pc-bg, #f1f5f9); color: var(--pc-accent, #475569);
  border: 1px solid var(--pc-border, #e2e8f0);
}

/* Guided stepper ({@stepper[guided=true]}) — each step is a collapsed <details>
   shown as a clickable bar (the label is a normal-flow <summary>, not a tab). */
details.htsl-step--guided { padding: 0; }
details.htsl-step--guided > summary.htsl-step-label {
  position: static; display: block; margin: 0; border: none;
  border-radius: 8px; background: #f1f5f9; color: #334155;
  padding: 0.55rem 0.9rem; cursor: pointer; list-style: none;
}
details.htsl-step--guided[open] > summary.htsl-step-label { border-radius: 8px 8px 0 0; }
details.htsl-step--guided > summary::-webkit-details-marker { display: none; }
details.htsl-step--guided > summary::before { content: "▸ "; color: #94a3b8; }
details.htsl-step--guided[open] > summary::before { content: "▾ "; }
details.htsl-step--guided > .htsl-step-body { padding: 0.8rem 0.95rem 0.6rem; }

/* Numbered exercise ({@exercise}) with an optional collapsible solution. */
.htsl-exo { border: 1px solid #e3e6ea; border-radius: 10px; margin: 1em 0; overflow: hidden; background: #fff; }
.htsl-exo-head { font-weight: 700; color: #3730a3; background: #eef2ff; padding: 0.5em 0.9em; border-bottom: 1px solid #e0e7ff; }
.htsl-exo-body { padding: 0.7em 0.9em; }
.htsl-exo-body > :first-child { margin-top: 0; }
.htsl-exo-body > :last-child { margin-bottom: 0; }
.htsl-exo-solution { border-top: 1px solid #eef0f3; }
.htsl-exo-solution > summary { cursor: pointer; padding: 0.45em 0.9em; font-weight: 600; color: #15803d; background: #f0fdf4; list-style: none; }
.htsl-exo-solution > summary::-webkit-details-marker { display: none; }
.htsl-exo-solution > summary::before { content: "▸ "; color: #86efac; }
.htsl-exo-solution[open] > summary::before { content: "▾ "; }
.htsl-exo-solution-body { padding: 0.7em 0.9em; }

/* Checklist ({@checklist: {item:…}}) — native checkboxes. */
.htsl-checklist { list-style: none; padding-left: 0; margin: 1em 0; }
.htsl-checklist li { margin: 0.25em 0; }
.htsl-checklist label { display: flex; align-items: baseline; gap: 0.55em; cursor: pointer; }
.htsl-checklist input { margin: 0; transform: translateY(1px); accent-color: #3b5bdb; cursor: pointer; }
.htsl-checklist input:checked + * , .htsl-checklist label:has(input:checked) { color: #64748b; }

/* Number line ({@numberline}) — SVG. */
.htsl-numberline { display: block; max-width: 100%; height: auto; margin: 0.8em auto; }

/* Truth table ({@truthtable}). */
.htsl-truthtable { border-collapse: collapse; margin: 1em auto; }
.htsl-truthtable th, .htsl-truthtable td { border: 1px solid #cbd5e1; padding: 0.3em 0.85em; text-align: center; }
.htsl-truthtable thead th { background: #eef2ff; font-weight: 700; color: #3730a3; }
.htsl-truthtable td.htsl-tt-true { color: #16a34a; font-weight: 600; }
.htsl-truthtable td.htsl-tt-false { color: #dc2626; font-weight: 600; }

/* Verbatim code block ({@codeblock}) — light theme, highlight.js-compatible. */
.htsl-code {
  margin: 1em 0; padding: 0.75em 1em; border-radius: 8px;
  background: #f6f8fa; border: 1px solid #e3e6ea; color: #24292e;
  font-size: 0.85em; line-height: 1.5; overflow-x: auto;
}
.htsl-code code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: none; color: inherit; padding: 0; white-space: pre; }

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

/* Ordered-list marker variants ({ol[type=…]}) — custom counters for the
   parenthesised / ")" formats that list-style-type alone cannot produce. */
.htsl-ol-alpha, .htsl-ol-alpha-upper,
.htsl-ol-roman, .htsl-ol-roman-upper,
.htsl-ol-paren {
  list-style: none;
  counter-reset: htsl-ol;
  padding-left: 2.2em;
}
.htsl-ol-alpha > li, .htsl-ol-alpha-upper > li,
.htsl-ol-roman > li, .htsl-ol-roman-upper > li,
.htsl-ol-paren > li {
  counter-increment: htsl-ol;
}
.htsl-ol-alpha > li::before,
.htsl-ol-alpha-upper > li::before,
.htsl-ol-roman > li::before,
.htsl-ol-roman-upper > li::before,
.htsl-ol-paren > li::before {
  display: inline-block;
  width: 2.2em;
  margin-left: -2.2em;
  text-align: left;
}
.htsl-ol-alpha > li::before { content: "(" counter(htsl-ol, lower-alpha) ") "; }
.htsl-ol-alpha-upper > li::before { content: "(" counter(htsl-ol, upper-alpha) ") "; }
.htsl-ol-roman > li::before { content: "(" counter(htsl-ol, lower-roman) ") "; }
.htsl-ol-roman-upper > li::before { content: "(" counter(htsl-ol, upper-roman) ") "; }
.htsl-ol-paren > li::before { content: counter(htsl-ol, decimal) ") "; }

/* Paged document (@document > @page) — sheets on screen, real pages in print.
   On screen every page is a white sheet that GROWS with its content (nothing is
   clipped). In print each page starts on a fresh sheet and any overflow flows
   onto the next sheet automatically (the browser's own pagination). */
.htsl-doc {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 1.2rem;
  background: #eef1f5; padding: 1.4rem; border-radius: 10px; margin: 1em 0;
  /* Pages render at their TRUE size (so content wraps exactly as in print and
     h-full/flex layouts are correct); the runtime zooms the whole doc to fit the
     pane. Reset to 1 in print. */
  zoom: var(--htsl-zoom, 1);
}
.htsl-doc-pdf {
  position: absolute; top: 0.7rem; right: 0.7rem; z-index: 2;
  cursor: pointer; border: 1px solid #cbd0d8; background: #fff; color: #1f2937;
  padding: 0.4em 0.75em; border-radius: 7px;
  font: 600 0.85rem/1 system-ui, sans-serif;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}
.htsl-doc-pdf:hover { background: #eef2ff; border-color: #3b5bdb; }
.htsl-doc-pdf:active { transform: translateY(1px); }
.htsl-doc-page {
  position: relative;
  box-sizing: border-box;
  display: flex; flex-direction: column;
  width: var(--htsl-doc-w, 210mm);
  min-height: var(--htsl-doc-h, 297mm);
  padding: var(--htsl-doc-pad, 20mm);
  background: #fff;
  color: #111827;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.16), 0 8px 24px rgba(15, 23, 42, 0.1);
  border-radius: 2px;
}
.htsl-doc-page > :first-child { margin-top: 0; }
.htsl-doc-page > :last-child { margin-bottom: 0; }
/* Content area grows so the footer sticks to the bottom of a short page. */
.htsl-doc-content { flex: 1 1 auto; }
.htsl-doc-content > :first-child { margin-top: 0; }
.htsl-doc-content > :last-child { margin-bottom: 0; }
/* Running header / footer (repeated per page; the number sits at the footer end). */
.htsl-doc-head {
  margin-bottom: 6mm; padding-bottom: 2mm; border-bottom: 1px solid #e3e6ea;
  font: 500 0.82rem/1.3 system-ui, sans-serif; color: #6b7280;
}
.htsl-doc-foot {
  margin-top: 6mm; padding-top: 2mm; border-top: 1px solid #e3e6ea;
  display: flex; align-items: baseline; justify-content: space-between; gap: 1em;
  font: 500 0.82rem/1.3 system-ui, sans-serif; color: #6b7280;
}
.htsl-doc-num { font: 500 0.82rem/1 ui-monospace, monospace; color: #94a3b8; }
/* Background grids (writing aid). Only print with "Background graphics" enabled.
   The ruling step --htsl-rule is shared by the gradient AND the text line-height so
   the body text rests on the lines (ruled/squares only). Headings take 2 rulings and
   block margins are whole rulings, so the rhythm holds; math/images may still drift. */
.htsl-doc-page--grid-lines .htsl-doc-content,
.htsl-doc-page--grid-squares .htsl-doc-content { --htsl-rule: 28px; }
.htsl-doc-page--grid-lines .htsl-doc-content {
  background-image: repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--htsl-rule) - 1px), #d5deee calc(var(--htsl-rule) - 1px), #d5deee var(--htsl-rule));
}
.htsl-doc-page--grid-squares .htsl-doc-content {
  background-image:
    repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--htsl-rule) - 1px), #d5deee calc(var(--htsl-rule) - 1px), #d5deee var(--htsl-rule)),
    repeating-linear-gradient(to right, transparent 0, transparent calc(var(--htsl-rule) - 1px), #d5deee calc(var(--htsl-rule) - 1px), #d5deee var(--htsl-rule));
}
.htsl-doc-page--grid-dots .htsl-doc-content {
  background-image: radial-gradient(#c4d0e6 1.2px, transparent 1.4px);
  background-size: 22px 22px;
}
/* Lock the text rhythm to the ruling so text sits on the lines. */
.htsl-doc-page--grid-lines .htsl-doc-content,
.htsl-doc-page--grid-squares .htsl-doc-content { line-height: var(--htsl-rule); }
.htsl-doc-page--grid-lines .htsl-doc-content > *,
.htsl-doc-page--grid-squares .htsl-doc-content > * { margin-top: 0; margin-bottom: var(--htsl-rule); }
.htsl-doc-page--grid-lines .htsl-doc-content :is(h1, h2, h3, h4, h5, h6),
.htsl-doc-page--grid-squares .htsl-doc-content :is(h1, h2, h3, h4, h5, h6) {
  line-height: calc(var(--htsl-rule) * 2);
}
/* Overflow warning: the runtime adds .htsl-doc-page--overflow when a page's content
   is taller than one sheet (it will spill onto the next printed page). Purely an
   on-screen authoring aid — non-blocking, and hidden from print. */
.htsl-doc-page--overflow::before {
  content: "⚠ Le contenu déborde de la page";
  position: absolute; top: 6px; left: 6px; z-index: 3;
  background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;
  padding: 2px 9px; border-radius: 999px;
  font: 600 0.72rem/1.4 system-ui, sans-serif;
  pointer-events: none;
}
/* An overflowing page grows past the sheet on screen (flex kept, so h-full/flex
   layouts stay correct — the warning signals it). The switch to block layout, which
   a flex container needs to paginate without duplicating across printed sheets, is
   applied only in print (@media print below). */

@media print {
  .htsl-doc-page--overflow::before { display: none; }
  .htsl-doc { zoom: 1; } /* no preview scaling in print — real sheet size */
  /* Overflowing page → block, so it paginates across sheets without the flex
     container duplicating its content (Chrome print bug). Pages that fit stay flex. */
  .htsl-doc-page--overflow { display: block; }
  /* Sheet edges = paper edges; each page's own padding (20mm) is the margin. The
     document owns its margins, so neutralise any host body padding/margin (the
     playground adds 1.8cm 2cm for plain docs) — otherwise the near-full-height page
     would overflow onto a blank second sheet. */
  @page { margin: 0; }
  body:has(.htsl-doc) { margin: 0; padding: 0; }
  .htsl-doc { display: block; background: none; padding: 0; margin: 0; border-radius: 0; }
  .htsl-doc-pdf { display: none !important; }
  /* Each page fills one physical sheet, so the flex content and the grid reach the
     bottom edge. min-height comes from the per-format screen rules (297/279/210mm);
     padding (the text margin) is kept from those rules too. */
  .htsl-doc-page {
    width: 100%; margin: 0;
    background: #fff; box-shadow: none; border-radius: 0;
    break-before: page; break-inside: auto;
  }
  .htsl-doc-page:first-child { break-before: auto; }
  /* Print: real mm height, no aspect-ratio (content must flow/paginate freely).
     ~1mm under the sheet so a full page never spills a blank one. */
  .htsl-doc-page { aspect-ratio: auto; min-height: calc(var(--htsl-doc-h, 297mm) - 1mm); }
}

/* Book reader (@document[mode=book]) — leaf through pages one at a time on
   screen, like a real book. Print is unaffected (all pages shown, one per sheet). */
.htsl-doc--book {
  background: #e8e2d6; gap: 0.9rem; padding: 1.6rem 1rem;
}
.htsl-doc--book:focus { outline: none; }
.htsl-doc--book:focus-visible { outline: 2px solid #3b5bdb; outline-offset: 3px; }
.htsl-doc--book .htsl-book-stage { perspective: 2000px; width: var(--htsl-doc-w, 210mm); }
.htsl-doc--book .htsl-book-stage > .htsl-doc-page { display: none; margin: 0 auto; }
/* Keep the flex column (base .htsl-doc-page) so the footer stays pinned to the
   bottom of the sheet — a plain block here would let it float under the text. */
.htsl-doc--book .htsl-book-stage > .htsl-doc-page.is-current { display: flex; }
/* Before hydration, show the first page so the reader is never blank. */
.htsl-doc--book:not([data-htsl-book-ready]) .htsl-book-stage > .htsl-doc-page:first-child { display: flex; }
.htsl-book-turn-next { transform-origin: left center; animation: htsl-book-turn-fwd 0.45s ease; }
.htsl-book-turn-prev { transform-origin: right center; animation: htsl-book-turn-bwd 0.45s ease; }
@keyframes htsl-book-turn-fwd { from { transform: rotateY(-92deg); opacity: 0.25; } to { transform: rotateY(0); opacity: 1; } }
@keyframes htsl-book-turn-bwd { from { transform: rotateY(92deg); opacity: 0.25; } to { transform: rotateY(0); opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .htsl-book-turn-next, .htsl-book-turn-prev { animation: none; }
}
.htsl-book-nav { display: flex; align-items: center; gap: 0.6rem; }
.htsl-book-btn {
  cursor: pointer; border: 1px solid #cbd0d8; background: #fff; color: #1f2937;
  width: 2.2rem; height: 2.2rem; border-radius: 999px; font-size: 1.2rem; line-height: 1;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}
.htsl-book-btn:hover { background: #eef2ff; border-color: #3b5bdb; }
.htsl-book-btn:disabled { opacity: 0.4; cursor: default; }
.htsl-book-counter { font: 500 0.85rem/1 ui-monospace, monospace; color: #4b5563; min-width: 3.2rem; text-align: center; }
@media print {
  .htsl-doc--book { background: none; padding: 0; }
  .htsl-doc--book .htsl-book-nav { display: none; }
  .htsl-doc--book .htsl-book-stage { perspective: none; width: auto; }
  .htsl-doc--book .htsl-book-stage > .htsl-doc-page { display: flex !important; animation: none !important; }
}
`.trim();
