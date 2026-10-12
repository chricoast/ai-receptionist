import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Runs the receptionist test set against the real Claude API (costs money).
// Usage: ANTHROPIC_API_KEY=... npm run eval
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./evals/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    include: ["evals/**/*.eval.ts"],
    testTimeout: 120_000,
    maxConcurrency: 3,
  },
});
