import type { Plugin, UserConfig } from "vite";

export interface CliPluginOptions {
  entries: Record<string, string>;
  outDir?: string;
  target?: string;
  sourcemap?: boolean;
  minify?: boolean;
  external?: Array<string | RegExp>;
}

export function cli(options: CliPluginOptions): Plugin {
  const {
    entries,
    outDir = "bin",
    target = "node24",
    sourcemap = true,
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
            },
          },
        },
      };
    },
  };
}
