import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    target: "node24",
    outDir: "bin",
    emptyOutDir: false,
    lib: {
      entry: {
        "discover-test-packages": resolve(
          import.meta.dirname,
          "src/discover-test-packages.mts",
        ),
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
    minify: false,
    sourcemap: true,
  },
});
