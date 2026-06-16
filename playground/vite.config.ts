import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Import the engine and the editor package straight from source (hot reload).
const fromHere = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@htsl/core": fromHere("../packages/core/src/index.ts"),
      "@htsl/codemirror": fromHere("../packages/codemirror/src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
    target: "es2020",
    rollupOptions: {
      input: {
        main: fromHere("index.html"),
        documentation: fromHere("documentation.html"),
      },
    },
  },
});
