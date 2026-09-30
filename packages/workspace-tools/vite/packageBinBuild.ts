import { glob, readFile, rm } from "node:fs/promises";
import { basename, resolve } from "node:path";

import type { InlineConfig, Plugin, ResolvedConfig } from "vite";
import { build } from "vite";

export interface PackageBinBuildOptions {
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
  options: Omit<PackageBinBuildOptions, "include"> = {},
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

  const actualEntries = Object.entries(pkg.bin).sort(([a], [b]) => a.localeCompare(b));
  const expectedEntries = Object.entries(expected).sort(([a], [b]) => a.localeCompare(b));

  if (
    actualEntries.length !== expectedEntries.length ||
    actualEntries.some(
      ([name, path], index) =>
        name !== expectedEntries[index]?.[0] || path !== expectedEntries[index]?.[1],
    )
  ) {
    throw new Error(
      `package.json#bin must match discovered CLI entries. Expected: ${JSON.stringify(expected)}`,
    );
  }
}

/**
 * Vite plugin that builds every CLI matching include as an independent
 * executable with no shared runtime chunks.
 */
export function packageBinBuild(options: PackageBinBuildOptions): Plugin {
  const virtualEntry = "\0moyarich:package-bin-build";
  let resolvedConfig: ResolvedConfig;

  return {
    name: "moyarich:package-bin-build",
    enforce: "pre",

    config() {
      return {
        build: {
          rollupOptions: {
            input: virtualEntry,
          },
        },
      };
    },

    resolveId(id) {
      if (id === virtualEntry) return virtualEntry;
    },

    load(id) {
      if (id === virtualEntry) return "export const packageBinBuild = true;";
    },

    configResolved(config) {
      resolvedConfig = config;
    },

    async buildStart() {
      const root = resolvedConfig.root;
      const entries = await discoverCliEntries(options.include, root);
      if (Object.keys(entries).length === 0) {
        throw new Error(`No CLI entries matched "${options.include}"`);
      }

      const outDir = options.outDir ?? "bin";
      await validatePackageBins(entries, outDir, root);
      await rm(resolve(root, outDir), { recursive: true, force: true });

      const { include: _include, ...buildOptions } = options;
      for (const { config } of standaloneCliBuilds(entries, buildOptions, root)) {
        await build({ ...config, logLevel: resolvedConfig.logLevel });
      }
    },

    generateBundle(_outputOptions, bundle) {
      for (const fileName of Object.keys(bundle)) delete bundle[fileName];
    },
  };
}
