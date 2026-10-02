import { chmod, copyFile, glob, readFile, rm } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";

import type { InlineConfig, Plugin, ResolvedConfig } from "vite";
import { build } from "vite";

export interface PackageBinEntry {
  pattern: string;
  bin?: string;
}

export interface PackageBinBuildOptions {
  entries?: PackageBinEntry | PackageBinEntry[];
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

const managedBinExtensions = new Set([".js", ".mjs", ".cjs", ".sh"]);

const defaultEntries: PackageBinEntry[] = [
  { pattern: "src/**/*.ts" },
  { pattern: "src/cli/**/*.sh", bin: "./bin/{name}.sh" },
];

async function readManagedPackageBins(root: string): Promise<PackageBins> {
  const pkg = JSON.parse(
    await readFile(resolve(root, "package.json"), "utf8"),
  ) as {
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
  entryOptions: PackageBinBuildOptions["entries"] = defaultEntries,
  root = process.cwd(),
  bins?: PackageBins,
): Promise<Record<string, string>> {
  const entryRules = (
    Array.isArray(entryOptions) ? entryOptions : [entryOptions]
  ).map((entry) => ({ bin: "./bin/{name}.mjs", ...entry }));
  const managedBins = bins ?? (await readManagedPackageBins(root));
  const candidates = new Map<string, string[]>();

  for (const entryRule of entryRules) {
    for await (const entry of glob(entryRule.pattern, { cwd: root })) {
      const name = basename(entry).replace(/\.[^.]+$/, "");
      const expectedBin = entryRule.bin.replaceAll("{name}", name);
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
        [
          `Package bin source collision for "${name}".`,
          ...matches.map((match) => `  - ${match}`),
          "",
          "Each package bin must resolve to exactly one source file.",
          'Narrow packageBinBuild({ entries: { pattern: "..." } }) to the directory containing executable entry points.',
          'For example: entries: { pattern: "src/cli/**/*.ts" }',
        ].join("\n"),
      );
    }
    entries[name] = matches[0];
  }

  return entries;
}

export function standaloneCliBuilds(
  entries: Record<string, string>,
  options: Omit<PackageBinBuildOptions, "entries" | "emptyOutDir"> = {},
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
            async banner() {
              const source = await readFile(entry, "utf8");
              return source.startsWith("#!") ? "" : "#!/usr/bin/env node";
            },
            entryFileNames: `${name}.mjs`,
            codeSplitting: false,
          },
        },
      },
    },
  }));
}

/**
 * Copies shell CLI sources to their package bin destinations and makes them
 * executable without passing them through Vite.
 */
export async function copyShellCliEntries(
  entries: Record<string, string>,
  bins: PackageBins,
  root = process.cwd(),
): Promise<void> {
  for (const [name, entry] of Object.entries(entries)) {
    const destination = bins[name];
    if (!destination) continue;

    const outputPath = resolve(root, destination);
    await copyFile(entry, outputPath);
    await chmod(outputPath, 0o755);
  }
}

/**
 * Vite plugin that builds Node.js package bins as independent executables and
 * copies shell package bins as executable scripts.
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
      const entries = await discoverCliEntries(options.entries, root, bins);

      if (Object.keys(entries).length === 0) {
        throw new Error("No managed package bins were found");
      }

      const outDir = options.outDir ?? "bin";
      if (options.emptyOutDir) {
        await rm(resolve(root, outDir), { recursive: true, force: true });
      }

      const shellEntries = Object.fromEntries(
        Object.entries(entries).filter(([, entry]) => extname(entry) === ".sh"),
      );
      const nodeEntries = Object.fromEntries(
        Object.entries(entries).filter(([, entry]) => extname(entry) !== ".sh"),
      );

      const {
        entries: _entries,
        emptyOutDir: _emptyOutDir,
        ...buildOptions
      } = options;

      for (const { name, config } of standaloneCliBuilds(
        nodeEntries,
        buildOptions,
        root,
      )) {
        await build({ ...config, logLevel: resolvedConfig.logLevel });
        await chmod(resolve(root, outDir, `${name}.mjs`), 0o755);
      }

      await copyShellCliEntries(shellEntries, bins, root);
    },

    generateBundle(_outputOptions, bundle) {
      for (const fileName of Object.keys(bundle)) delete bundle[fileName];
    },
  };
}
