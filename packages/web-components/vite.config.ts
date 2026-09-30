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
        index: resolve(import.meta.dirname, "src/index.mjs"),
        caption: resolve(
          import.meta.dirname,
          "src/caption/caption-overlay.mjs",
        ),
        "caption-element": resolve(
          import.meta.dirname,
          "src/caption/caption-overlay.mjs",
        ),
        "cursor-overlay": resolve(
          import.meta.dirname,
          "src/cursor-overlay/cursor-overlay-element.mjs",
        ),
        "cursor-overlay-element": resolve(
          import.meta.dirname,
          "src/cursor-overlay/cursor-overlay-element.mjs",
        ),
        "magnifier-cursor-overlay": resolve(
          import.meta.dirname,
          "src/magnifier-cursor-overlay/element.mjs",
        ),
        "magnifier-cursor-overlay-element": resolve(
          import.meta.dirname,
          "src/magnifier-cursor-overlay/element.mjs",
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
