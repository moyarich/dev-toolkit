import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { packageBinBuild } from "@moyarich/vite-plugin-package-bin";
import { defineConfig, type Plugin } from "vite";

function assembleRuntimePackage(): Plugin {
  let root = process.cwd();

  return {
    name: "moyarich:auto-glow-dist",
    enforce: "pre",

    configResolved(config) {
      root = config.root;
    },

    async buildStart() {
      const dist = resolve(root, "dist");
      await rm(dist, { recursive: true, force: true });
      await mkdir(resolve(dist, "bin"), { recursive: true });
      await mkdir(resolve(dist, "lib"), { recursive: true });
    },

    async closeBundle() {
      const dist = resolve(root, "dist");

      await Promise.all([
        copyFile(
          resolve(root, "lib/core.zsh"),
          resolve(dist, "lib/core.zsh"),
        ),
        copyFile(
          resolve(root, "moyarich-auto-glow-md.plugin.zsh"),
          resolve(dist, "moyarich-auto-glow-md.plugin.zsh"),
        ),
        copyFile(resolve(root, "install.sh"), resolve(dist, "install.sh")),
        copyFile(resolve(root, "README.md"), resolve(dist, "README.md")),
      ]);
    },
  };
}

export default defineConfig({
  plugins: [
    assembleRuntimePackage(),
    packageBinBuild({
      entries: {
        pattern: "src/cli/**/*.sh",
        bin: "./dist/bin/{name}.sh",
      },
      emptyOutDir: false,
      outDir: "dist/bin",
    }),
  ],
});
