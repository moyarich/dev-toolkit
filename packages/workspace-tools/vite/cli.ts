import { glob, readFile, rm } from "node:fs/promises";
import { basename, resolve } from "node:path";

import type { InlineConfig } from "vite";
import { build } from "vite";

export interface CliPluginOptions {
  include: string;
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

export async function discoverCliEntries(
  include: string,
  root = process.cwd(),
): Promise<Record<string, string>> {
  const entries: Record<string, string> = {};

  for await (const entry of glob(include, { cwd: root })) {
    const name = basename(entry).replace(/\.[^.]+$/, "");
    entries[name] = resolve(root, entry);
  }

  return Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
}

export function standaloneCliBuilds(
  entries: Record<string, string>,
  options: Omit<CliPluginOptions, "include"> = {},
  root = process.cwd(),
): StandaloneCliBuild[] {
  const {
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

async function validatePackageBins(
  entries: Record<string, string>,
  outDir: string,
  root: string,
): Promise<void> {
  const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as {
    bin?: string | Record<string, string>;
  };
  if (!pkg.bin || typeof pkg.bin === "string") return;

  const expected = Object.fromEntries(
    Object.keys(entries).map((name) => [name, `./${outDir}/${name}.mjs`]),
  );

  if (JSON.stringify(pkg.bin) !== JSON.stringify(expected)) {
    throw new Error(
      `package.json#bin must match discovered CLI entries. Expected: ${JSON.stringify(expected)}`,
    );
  }
}

/**
 * Build every CLI matching include as an independent executable with no
 * shared runtime chunks. The source filename becomes the package bin name.
 */
export async function cli(
  options: CliPluginOptions,
  root = process.cwd(),
): Promise<void> {
  const entries = await discoverCliEntries(options.include, root);
  if (Object.keys(entries).length === 0) {
    throw new Error(`No CLI entries matched "${options.include}"`);
  }

  const outDir = options.outDir ?? "bin";
  await validatePackageBins(entries, outDir, root);
  await rm(resolve(root, outDir), { recursive: true, force: true });

  const { include: _include, ...buildOptions } = options;
  for (const { config } of standaloneCliBuilds(entries, buildOptions, root)) {
    await build(config);
  }
}
