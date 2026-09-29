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
        "confirm-publish": resolve(import.meta.dirname, "src/confirm-publish.mjs"),
        "vs-code-publish": resolve(import.meta.dirname, "src/publish_ext.mjs"),
        "run-extension-dev": resolve(import.meta.dirname, "src/run-extension-dev.mjs"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: [/^node:/],
      output: { banner: "#!/usr/bin/env node" },
    },
  },
});
