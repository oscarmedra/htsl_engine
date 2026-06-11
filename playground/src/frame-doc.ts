/**
 * Builds the full HTML document injected into the render <iframe> via srcdoc.
 *
 * Rendering in a sandboxed iframe means the user can load ANY CSS/JS framework
 * straight from their HTSL (`{link[rel="stylesheet", href="…"]/}`,
 * `{script[src="…"]/}`) — those tags execute naturally inside the document and
 * stay isolated from the playground's own interface.
 *
 * KaTeX CSS is always provided; Plotly (for geometry scenes) is loaded only when
 * the output actually contains a scene.
 */
const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
const PLOTLY_JS = "https://cdn.plot.ly/plotly-2.27.0.min.js";

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body { font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f2430; margin: 0; padding: 1rem 1.1rem; }
  h1 { font-size: 1.6rem; } h2 { font-size: 1.25rem; }
`;

const HYDRATE = `
  (function () {
    if (typeof window.Plotly === "undefined") return;
    document.querySelectorAll(".htsl-scene[data-htsl-scene]").forEach(function (el) {
      try {
        var spec = JSON.parse(el.getAttribute("data-htsl-scene"));
        el.textContent = "";
        window.Plotly.newPlot(el, spec.data, spec.layout, { displayModeBar: false, responsive: true });
      } catch (e) {}
    });
  })();
`;

export function buildFrameDoc(html: string, mathCss: string): string {
  const needsPlotly = html.includes("data-htsl-scene");
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<base target="_blank" />
<link rel="stylesheet" href="${KATEX_CSS}" />
<style>${BASE_CSS}${mathCss}</style>
${needsPlotly ? `<script src="${PLOTLY_JS}"></script>` : ""}
</head>
<body>
${html}
${needsPlotly ? `<script>${HYDRATE}</script>` : ""}
</body>
</html>`;
}
