import { defineConfig } from "vite";
import { packageBinBuild } from "../workspace-tools/vite/packageBinBuild.ts";

export default defineConfig({
  plugins: [
    packageBinBuild({
      include: "src/cli/*.ts",
      sourcemap: true,
      external: ["playwright"],
    }),
  ],
});
