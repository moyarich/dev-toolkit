import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  css: {
    transformer: "lightningcss",
  },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        caption: resolve(import.meta.dirname, "src/caption/caption-overlay.ts"),
        "caption-element": resolve(
          import.meta.dirname,
          "src/caption/caption-overlay.ts",
        ),
        "cursor-overlay": resolve(
          import.meta.dirname,
          "src/cursor-overlay/cursor-overlay-element.ts",
        ),
        "cursor-overlay-element": resolve(
          import.meta.dirname,
          "src/cursor-overlay/cursor-overlay-element.ts",
        ),
        "magnifier-cursor-overlay": resolve(
          import.meta.dirname,
          "src/magnifier-cursor-overlay/element.ts",
        ),
        "magnifier-cursor-overlay-element": resolve(
          import.meta.dirname,
          "src/magnifier-cursor-overlay/element.ts",
        ),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: [/\.css$/],
    },
  },
});
