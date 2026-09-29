import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    target: "node24",
    outDir: "bin",
    emptyOutDir: true,
    lib: {
      entry: {
        "workspace-release": resolve(import.meta.dirname, "src/cli/workspace-release.mts"),
        "workspace-publish": resolve(import.meta.dirname, "src/cli/workspace-publish.mts"),
        "workspace-dependency-check": resolve(
          import.meta.dirname,
          "src/cli/workspace-dependency-check.mts",
        ),
        "discover-test-packages": resolve(
          import.meta.dirname,
          "src/cli/discover-test-packages.mts",
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
