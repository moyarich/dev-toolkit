import { rm } from "node:fs/promises";
import { resolve } from "node:path";

import type { InlineConfig, Plugin, ResolvedConfig, UserConfig } from "vite";
import { build } from "vite";

export interface CliPluginOptions {
  entries: Record<string, string>;
  outDir?: string;
  target?: string;
  sourcemap?: boolean;
  minify?: boolean;
  external?: Array<string | RegExp>;
}

export interface StandaloneCliBuild {
  name: string;
  config: InlineConfig;
}

export function standaloneCliBuilds(
  options: CliPluginOptions,
  root = process.cwd(),
): StandaloneCliBuild[] {
  const {
    entries,
    outDir = "bin",
    target = "node24",
    sourcemap = false,
    minify = false,
    external = [],
  } = options;

  return Object.entries(entries).map(([name, entry]) => ({
    name,
    config: {
      root,
      configFile: false,
      build: {
        target,
        outDir: resolve(root, outDir),
        emptyOutDir: false,
        sourcemap,
        minify,
        lib: {
          entry,
          formats: ["es"],
          fileName: () => `${name}.mjs`,
        },
        rollupOptions: {
          external: [/^node:/, ...external],
          output: {
            banner: "#!/usr/bin/env node",
            entryFileNames: `${name}.mjs`,
            inlineDynamicImports: true,
          },
        },
      },
    },
  }));
}

/**
 * Build each Node.js CLI entry independently so every bin/*.mjs file is a
 * standalone executable with no shared runtime chunks.
 */
export function cli(options: CliPluginOptions): Plugin {
  let resolvedConfig: ResolvedConfig;

  return {
    name: "moyarich:cli",
    enforce: "pre",

    config(): UserConfig {
      return {
        build: {
          outDir: options.outDir ?? "bin",
          emptyOutDir: false,
          rollupOptions: {
            input: "virtual:moyarich-cli-orchestrator",
          },
        },
      };
    },

    configResolved(config) {
      resolvedConfig = config;
    },

    resolveId(id) {
      if (id === "virtual:moyarich-cli-orchestrator") return "\0virtual:moyarich-cli-orchestrator";
    },

    load(id) {
      if (id === "\0virtual:moyarich-cli-orchestrator") return "export {};";
    },

    async buildStart() {
      if (resolvedConfig.build.watch) return;

      const outDir = resolve(resolvedConfig.root, options.outDir ?? "bin");
      await rm(outDir, { recursive: true, force: true });

      for (const { config } of standaloneCliBuilds(options, resolvedConfig.root)) {
        await build({
          ...config,
          logLevel: resolvedConfig.logLevel,
        });
      }
    },

    generateBundle(_outputOptions, bundle) {
      for (const fileName of Object.keys(bundle)) delete bundle[fileName];
    },
  };
}
