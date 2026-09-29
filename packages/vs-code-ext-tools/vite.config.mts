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
      entry: {        "vs-code-publish": resolve(import.meta.dirname, "src/cli/vs-code-publish.mts"),
        "run-extension-dev": resolve(import.meta.dirname, "src/cli/run-extension-dev.mts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: [/^node:/],
      output: {
        banner: "#!/usr/bin/env node",
      },
    },
  },
});
