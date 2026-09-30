import { defineConfig } from "vite";
import { packageBinBuild } from "./vite/packageBinBuild.ts";

export default defineConfig({
  plugins: [
    packageBinBuild({
      include: "src/cli/*.ts",
    }),
  ],
});
