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
`.trim();
