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
        demo: resolve(import.meta.dirname, "src/cli/demo.ts"),
        "demo-strategy": resolve(import.meta.dirname, "src/cli/demo-strategy.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: [/^node:/, "@vscode/test-electron", "playwright-core"],
      output: {
        banner: "#!/usr/bin/env node",
      },
    },
  },
});
