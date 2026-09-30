import { defineConfig } from "vite";
import { packageBinBuild } from "@moyarich/vite-plugin-package-bin";

export default defineConfig({
  plugins: [
    packageBinBuild({
      include: "src/**/*.ts",
      emptyOutDir: true,
      sourcemap: true,
      external: [/^@inquirer\//, "chalk", "commander"],
    }),
  ],
});
