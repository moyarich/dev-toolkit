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
        "readme-screenshots": resolve(
          import.meta.dirname,
          "src/cli/readme-screenshots.ts",
        ),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: [/^node:/, "playwright"],
      output: {
        banner: "#!/usr/bin/env node",
      },
    },
  },
});
