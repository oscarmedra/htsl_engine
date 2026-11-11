import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  target: "es2020",
  platform: "neutral",
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
});
