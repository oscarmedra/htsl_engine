/**
 * CDN auto-hydrate entry (for the IIFE `<script>` build).
 *
 * Including this build on a page installs the runtime immediately: it exposes
 * the single global `window.HTSL`, hydrates any `data-htsl-*` nodes already in
 * the document on `DOMContentLoaded`, keeps in sync via a `MutationObserver`,
 * and lazy-loads KaTeX / Plotly / Three only when needed.
 *
 * The full engine (`compile`, `parse`, …) is also exposed as `htsl_engine`, so
 * a page can compile HTSL on the fly:
 *
 *   <script src="https://unpkg.com/@htsl/core/dist-min/htsl.auto.global.js"></script>
 *   <div id="out"></div>
 *   <script>
 *     document.getElementById("out").innerHTML =
 *       htsl_engine.compile("{h1:Bonjour} {@mte: E = mc^2}");
 *     // the MutationObserver hydrates the injected math automatically
 *   </script>
 */
import htsl_engine from "./index.js";
import { installHtslRuntime } from "./runtime.js";

installHtslRuntime();

export default htsl_engine;
