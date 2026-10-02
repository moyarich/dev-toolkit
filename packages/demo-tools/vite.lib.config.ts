import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "node24",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        strategy: resolve(import.meta.dirname, "src/strategy/index.ts"),
        utils: resolve(import.meta.dirname, "src/utils/index.ts"),
        vscode: resolve(import.meta.dirname, "src/vscode/index.ts"),
        capture: resolve(import.meta.dirname, "src/capture/index.ts"),
        browser: resolve(import.meta.dirname, "src/browser/index.ts"),
        components: resolve(import.meta.dirname, "src/components/index.ts"),
        generate: resolve(import.meta.dirname, "src/generate/index.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    rollupOptions: {
      external: [
        /^node:/,
        "@moyarich/web-components",
        "@vscode/test-electron",
        "playwright-core",
        "chalk",
        "commander",
        /^@inquirer\//,
      ],
    },
  },
});
