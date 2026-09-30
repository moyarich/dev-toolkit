import { glob, readFile, rm } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";

import type { InlineConfig, Plugin, ResolvedConfig } from "vite";
import { build } from "vite";

export interface PackageBinInclude {
  glob: string;
  bin?: string;
}

export interface PackageBinBuildOptions {
  include: string | PackageBinInclude | Array<string | PackageBinInclude>;
  emptyOutDir: boolean;
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

type PackageBins = Record<string, string>;

const managedBinExtensions = new Set([".js", ".mjs", ".cjs"]);

async function readManagedPackageBins(root: string): Promise<PackageBins> {
  const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as {
    bin?: string | PackageBins;
  };

  if (!pkg.bin || typeof pkg.bin === "string") return {};

  return Object.fromEntries(
    Object.entries(pkg.bin)
      .filter(([, path]) => managedBinExtensions.has(extname(path)))
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

export async function discoverCliEntries(
  include: PackageBinBuildOptions["include"],
  root = process.cwd(),
  bins?: PackageBins,
): Promise<Record<string, string>> {
  const includes = (Array.isArray(include) ? include : [include]).map((value) =>
    typeof value === "string" ? { glob: value, bin: "./bin/{name}.mjs" } : { bin: "./bin/{name}.mjs", ...value },
  );
  const managedBins = bins ?? (await readManagedPackageBins(root));
  const candidates = new Map<string, string[]>();

  for (const includeRule of includes) {
    for await (const entry of glob(includeRule.glob, { cwd: root })) {
      const name = basename(entry).replace(/\.[^.]+$/, "");
      const expectedBin = includeRule.bin.replaceAll("{name}", name);
      if (managedBins[name] !== expectedBin) continue;

      const matches = candidates.get(name) ?? [];
      matches.push(resolve(root, entry));
      candidates.set(name, matches);
    }
  }

  const entries: Record<string, string> = {};
  for (const name of Object.keys(managedBins)) {
    const matches = [...new Set(candidates.get(name) ?? [])];
    if (matches.length === 0) {
      throw new Error(`No source entry matched package bin "${name}"`);
    }
    if (matches.length > 1) {
      throw new Error(
        `Multiple source entries matched package bin "${name}": ${matches.join(", ")}`,
      );
    }
    entries[name] = matches[0];
  }

  return entries;
}

export function standaloneCliBuilds(
  entries: Record<string, string>,
  options: Omit<PackageBinBuildOptions, "include" | "emptyOutDir"> = {},
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

function validateManagedPackageBins(
  entries: Record<string, string>,
  bins: PackageBins,
  outDir: string,
): void {
  for (const name of Object.keys(entries)) {
    const expected = `./${outDir}/${name}.mjs`;
    if (bins[name] !== expected) {
      throw new Error(
        `package.json#bin["${name}"] must be "${expected}", received "${bins[name]}"`,
      );
    }
  }
}

/**
 * Vite plugin that builds managed package bins as independent Node.js
 * executables with no shared runtime chunks.
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
            onwarn(warning, warn) {
              if (
                warning.code === "EMPTY_BUNDLE" &&
                warning.message.includes("package-bin-build")
              ) {
                return;
              }
              warn(warning);
            },
          },
        },
      };
    },

    resolveId(id) {
      if (id === virtualEntry) return virtualEntry;
    },

    load(id) {
      if (id === virtualEntry) return "export {}";
    },

    configResolved(config) {
      resolvedConfig = config;
    },

    async buildStart() {
      const root = resolvedConfig.root;
      const bins = await readManagedPackageBins(root);
      const entries = await discoverCliEntries(options.include, root, bins);

      if (Object.keys(entries).length === 0) {
        throw new Error("No managed Node.js package bins were found");
      }

      const outDir = options.outDir ?? "bin";
      if (options.emptyOutDir) {
        await rm(resolve(root, outDir), { recursive: true, force: true });
      }

      const { include: _include, emptyOutDir: _emptyOutDir, ...buildOptions } = options;
      for (const { config } of standaloneCliBuilds(entries, buildOptions, root)) {
        await build({ ...config, logLevel: resolvedConfig.logLevel });
      }
    },

    generateBundle(_outputOptions, bundle) {
      for (const fileName of Object.keys(bundle)) delete bundle[fileName];
    },
  };
}
