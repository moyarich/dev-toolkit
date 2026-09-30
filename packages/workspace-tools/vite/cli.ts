import { rm } from "node:fs/promises";
import { resolve } from "node:path";

import type { InlineConfig } from "vite";
import { build } from "vite";

export interface CliBuildOptions {
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
  options: CliBuildOptions,
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
export async function buildCli(
  options: CliBuildOptions,
  root = process.cwd(),
): Promise<void> {
  const outDir = resolve(root, options.outDir ?? "bin");
  await rm(outDir, { recursive: true, force: true });

  for (const { config } of standaloneCliBuilds(options, root)) {
    await build(config);
  }
}
