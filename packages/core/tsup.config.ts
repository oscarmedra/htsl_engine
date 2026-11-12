import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  target: "es2020",
  platform: "neutral",
  // KaTeX is optional and consumer-provided (the CLI imports it dynamically): keep it
  // external so it is NOT bundled into the package (it would add ~1.7 MB).
  external: ["katex"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
});
