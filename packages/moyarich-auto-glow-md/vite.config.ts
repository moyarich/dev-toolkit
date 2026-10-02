import { defineConfig } from "vite";
import { packageBinBuild } from "@moyarich/vite-plugin-package-bin";

export default defineConfig({
  plugins: [
    packageBinBuild({
      entries: [
        {
          pattern: "src/cli/**/*.ts",
        },
        {
          pattern: "src/cli/**/*.sh",
          bin: "./bin/{name}.sh",
        },
      ],
      emptyOutDir: true,
    }),
  ],
});
