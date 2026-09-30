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
 * Configure Vite for standalone Node.js command-line entry points.
 *
 * Each entry is emitted as a self-contained .mjs executable. Shared source is
 * bundled into each CLI instead of creating runtime _chunks dependencies.
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

  const entryList = Object.entries(entries);
  if (entryList.length === 0) {
    throw new TypeError("cli() requires at least one entry.");
  }

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
          rollupOptions: {
            external: [/^node:/, ...external],
            input: Object.fromEntries(entryList),
            output: entryList.map(([name]) => ({
              banner: "#!/usr/bin/env node",
              entryFileNames: (chunkInfo) =>
                chunkInfo.name === name ? `${name}.mjs` : `_unused/${name}-[name].mjs`,
              chunkFileNames: `_unused/${name}-[name].mjs`,
              assetFileNames: `_unused/${name}-[name][extname]`,
              manualChunks: () => name,
            })),
          },
        },
      };
    },
  };
}
