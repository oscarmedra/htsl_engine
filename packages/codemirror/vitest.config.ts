import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Use the core engine straight from source (no build step needed for tests).
export default defineConfig({
  resolve: {
    alias: {
      htsl: fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
});
