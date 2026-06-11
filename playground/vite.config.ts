import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Import the engine straight from source for hot reload during development.
const htslSrc = fileURLToPath(new URL("../src/index.ts", import.meta.url));

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      htsl: htslSrc,
    },
  },
  build: {
    outDir: "dist",
    target: "es2020",
  },
});
