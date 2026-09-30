import { defineConfig } from "vite";
import { packageBinBuild } from "@moyarich/vite-plugin-package-bin";

export default defineConfig({
  plugins: [
    packageBinBuild({
      entries: {
        pattern: "src/cli/**/*.ts",
      },
      emptyOutDir: true,
      external: [/^@inquirer\//, "chalk", "commander"],
    }),
  ],
});
