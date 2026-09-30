import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "node24",
    outDir: "bin",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        "vs-code-publish": resolve(import.meta.dirname, "src/cli/vs-code-publish.ts"),
        "run-extension-dev": resolve(import.meta.dirname, "src/cli/run-extension-dev.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: [/^node:/, /^@inquirer\//, "chalk", "commander"],
    },
  },
});
