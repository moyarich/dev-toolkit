import { defineConfig } from "vite";
import { packageBinBuild } from "@moyarich/vite-plugin-package-bin";

export default defineConfig({
  plugins: [
    packageBinBuild({
      entries: { pattern: "src/**/*.ts" },
      emptyOutDir: true,
      sourcemap: true,
      external: [/^@inquirer\//, "chalk", "commander"],
    }),
  ],
});
