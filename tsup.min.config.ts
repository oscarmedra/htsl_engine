import { defineConfig } from "tsup";

/**
 * Minified distribution build.
 *
 * Produces, in dist-min/:
 *   - htsl.min.js          ESM, minified  (import { compile } from ".../htsl.min.js")
 *   - htsl.global.min.js   IIFE, minified, exposes a global `HTSL`  (<script> tag)
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
    globalName: "HTSL",
    target: "es2020",
    platform: "browser",
    minify: true,
    dts: false,
    sourcemap: false,
    clean: false,
  },
]);
