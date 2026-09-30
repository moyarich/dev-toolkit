import type { Plugin, UserConfig } from "vite";

export interface CliPluginOptions {
  entries: Record<string, string>;
  outDir?: string;
  target?: string;
  sourcemap?: boolean;
  minify?: boolean;
  external?: Array<string | RegExp>;
}

/**
 * Configure Vite for Node.js command-line entry points.
 *
 * Entry files and shared chunks use deterministic names so repeated builds do
 * not leave hash-named artifacts behind. Source maps are opt-in for published
 * CLI packages.
 */
export function cli(options: CliPluginOptions): Plugin {
  const {
    entries,
    outDir = "bin",
    target = "node24",
    sourcemap = false,
    minify = false,
    external = [],
  } = options;

  return {
    name: "moyarich:cli",
    enforce: "pre",

    config(): UserConfig {
      return {
        build: {
          target,
          outDir,
          emptyOutDir: true,
          sourcemap,
          minify,
          lib: {
            entry: entries,
            formats: ["es"],
            fileName: (_format, entryName) => `${entryName}.mjs`,
          },
          rollupOptions: {
            external: [/^node:/, ...external],
            output: {
              banner: "#!/usr/bin/env node",
              entryFileNames: "[name].mjs",
              chunkFileNames: "_chunks/[name].mjs",
            },
          },
        },
      };
    },
  };
}
