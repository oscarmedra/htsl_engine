import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2020",
  platform: "neutral",
  dts: true,
  clean: true,
  sourcemap: true,
  // @codemirror/*, @lezer/* and htsl are peerDependencies → kept external.
});
