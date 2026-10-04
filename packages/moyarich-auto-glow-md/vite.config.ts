import { chmod, copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { defineConfig, type Plugin } from "vite";

/**
 * Assemble the shell-native runtime package under dist/.
 *
 * Source files, tests, and development docs remain outside dist so the
 * publishable package boundary is explicit.
 */
function assembleRuntimePackage(): Plugin {
  const virtualEntry = "\0moyarich:auto-glow-dist";
  let root = process.cwd();

  return {
    name: "moyarich:auto-glow-dist",
    enforce: "pre",

    config() {
      return {
        build: {
          outDir: "dist",
          emptyOutDir: false,
          rollupOptions: {
            input: virtualEntry,
          },
        },
      };
    },

    configResolved(config) {
      root = config.root;
    },

    resolveId(id) {
      if (id === virtualEntry) return virtualEntry;
    },

    load(id) {
      if (id === virtualEntry) return "export {}";
    },

    async buildStart() {
      const dist = resolve(root, "dist");
      const bin = resolve(dist, "bin");
      const lib = resolve(dist, "lib");
      const config = resolve(dist, "config");
      const cli = resolve(bin, "moyarich-auto-glow-md.sh");
      const install = resolve(dist, "install.sh");
      const uninstall = resolve(dist, "uninstall.sh");

      await rm(dist, { recursive: true, force: true });
      await mkdir(bin, { recursive: true });
      await mkdir(lib, { recursive: true });
      await mkdir(config, { recursive: true });

      await Promise.all([
        copyFile(resolve(root, "src/cli/moyarich-auto-glow-md.sh"), cli),
        copyFile(resolve(root, "lib/core.zsh"), resolve(lib, "core.zsh")),
        copyFile(
          resolve(root, "config/config.zsh.example"),
          resolve(config, "config.zsh.example"),
        ),
        copyFile(
          resolve(root, "moyarich-auto-glow-md.plugin.zsh"),
          resolve(dist, "moyarich-auto-glow-md.plugin.zsh"),
        ),
        copyFile(resolve(root, "install.sh"), install),
        copyFile(resolve(root, "uninstall.sh"), uninstall),
        copyFile(resolve(root, "README.md"), resolve(dist, "README.md")),
      ]);

      await Promise.all([
        chmod(cli, 0o755),
        chmod(install, 0o755),
        chmod(uninstall, 0o755),
      ]);
    },

    generateBundle(_outputOptions, bundle) {
      for (const fileName of Object.keys(bundle)) {
        delete bundle[fileName];
      }
    },
  };
}

export default defineConfig({
  plugins: [assembleRuntimePackage()],
});
