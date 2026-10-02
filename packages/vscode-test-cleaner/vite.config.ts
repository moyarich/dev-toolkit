import { defineConfig } from "vite";
import { packageBinBuild } from "@moyarich/vite-plugin-package-bin";

export default defineConfig({
  plugins: [
    packageBinBuild({
      outDir: "dist/bin",
      entries: {
        pattern: "src/cli/**/*.ts",
        bin: "./dist/bin/{name}.mjs",
      },
      emptyOutDir: true,
    }),
  ],
});
