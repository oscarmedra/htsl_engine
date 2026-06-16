import { defineConfig } from "tsup";

/**
 * Minified distribution build.
 *
 * Produces, in dist-min/:
 *   - htsl.min.js     ESM, minified  (import htsl_engine from ".../htsl.min.js")
 *   - htsl.global.js  IIFE, minified, exposes the globals `htsl_engine` and
 *                     `HTSL_ENGINE`  (<script> tag → htsl_engine.compile(...))
 *   - htsl.auto.global.js  IIFE, minified, same global PLUS auto-installs the
 *                     runtime (`window.HTSL`) and hydrates `data-htsl-*` on
 *                     load — the drop-in `<script>` for a zero-build page.
 */
export default defineConfig([
  {
    entry: { "htsl.min": "src/index.ts" },
    outDir: "dist-min",
    format: ["esm"],
    target: "es2020",
    platform: "neutral",
    minify: true,
    dts: false,
    sourcemap: false,
    clean: true,
  },
  {
    entry: { htsl: "src/index.ts" },
    outDir: "dist-min",
    format: ["iife"],
    globalName: "htsl_engine",
    target: "es2020",
    platform: "browser",
    minify: true,
    dts: false,
    sourcemap: false,
    clean: false,
    // The default export carries the engine object; expose it (and an alias)
    // directly as the global instead of as `htsl_engine.default`.
    footer: {
      js: "if(typeof htsl_engine!=='undefined'&&htsl_engine.default){htsl_engine=htsl_engine.default;}globalThis.htsl_engine=htsl_engine;globalThis.HTSL_ENGINE=htsl_engine;",
    },
  },
  {
    // Auto-hydrate drop-in: same `htsl_engine` global, but the entry calls
    // installHtslRuntime() on load (exposes window.HTSL + hydrates the page).
    entry: { "htsl.auto": "src/cdn.ts" },
    outDir: "dist-min",
    format: ["iife"],
    globalName: "htsl_engine",
    target: "es2020",
    platform: "browser",
    minify: true,
    dts: false,
    sourcemap: false,
    clean: false,
    footer: {
      js: "if(typeof htsl_engine!=='undefined'&&htsl_engine.default){htsl_engine=htsl_engine.default;}globalThis.htsl_engine=htsl_engine;globalThis.HTSL_ENGINE=htsl_engine;",
    },
  },
]);
