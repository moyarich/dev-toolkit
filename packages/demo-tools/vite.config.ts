import { defineConfig } from "vite";
import { packageBinBuild } from "@moyarich/vite-plugin-package-bin";

export default defineConfig({
  plugins: [
    packageBinBuild({
      outDir: "dist/bin",
      emptyOutDir: true,
      sourcemap: true,
      external: ["@vscode/test-electron", "playwright-core"],
    }),
  ],
});
