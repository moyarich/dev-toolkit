#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { Option, program } from "commander";

import {
  canUseFzf,
  discoverVscodeTestCaches,
  formatBytes,
  removeVscodeTestCaches,
  type VscodeTestCache,
} from "../index.ts";

interface CliOptions {
  root: string;
  all?: boolean;
  json?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  fzf?: boolean;
}

/**
 * Determine whether a CLI executable is available on PATH.
 *
 * @param command Executable name.
 * @returns Whether the executable exists.
 */
function commandExists(command: string): boolean {
  const lookup = process.platform === "win32" ? "where" : "which";
  return spawnSync(lookup, [command], { stdio: "ignore" }).status === 0;
}

/**
 * Select one or more discovered caches using fzf.
 *
 * The path returned by fzf is parsed from a display row and is still validated
 * against the discovered candidate list before deletion.
 *
 * @param caches Discovered VS Code test caches.
 * @returns Selected cache paths.
 */
function selectCachesWithFzf(caches: VscodeTestCache[]): string[] {
  const rows = caches.map(
    (cache) => `${formatBytes(cache.sizeBytes).padStart(10)}\t${cache.path}`,
  );

  const result = spawnSync(
    "fzf",
    [
      "--multi",
      "--prompt",
      "VS Code test cache > ",
      "--height",
      "60%",
      "--layout",
      "reverse",
      "--border",
      "--header",
      "TAB: select multiple • ENTER: continue",
    ],
    {
      input: `${rows.join("\n")}\n`,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "inherit"],
    },
  );

  if (result.error) throw result.error;
  if (result.status === 1 || result.status === 130) return [];
  if (result.status !== 0) {
    throw new Error(`fzf exited with status ${result.status ?? "unknown"}.`);
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("\t").at(-1))
    .filter((path): path is string => Boolean(path));
}

/**
 * Print discovered caches as terminal output.
 *
 * @param caches Discovered caches.
 * @returns Nothing.
 */
function printCaches(caches: VscodeTestCache[]): void {
  console.log(chalk.bold("\nVS Code test environments"));

  for (const cache of caches) {
    console.log(
      `  ${chalk.cyan(formatBytes(cache.sizeBytes).padStart(10))}  ${cache.path}`,
    );
  }
}

/**
 * Run the vscode-test-clean command.
 *
 * @param options Commander options.
 * @returns Promise resolved when the command completes.
 */
async function cleanVscodeTestEnvironments(options: CliOptions): Promise<void> {
  const root = resolve(options.root);
  const caches = discoverVscodeTestCaches(root);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          root,
          count: caches.length,
          totalBytes: caches.reduce((total, cache) => total + cache.sizeBytes, 0),
          caches,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!caches.length) {
    console.log(chalk.green("No .vscode-test environments found."));
    return;
  }

  printCaches(caches);

  const useFzf = canUseFzf({
    enabled: options.fzf,
    stdinIsTTY: process.stdin.isTTY,
    stdoutIsTTY: process.stdout.isTTY,
    fzfAvailable: commandExists("fzf"),
  });

  let selectedPaths: string[];

  if (options.all) {
    selectedPaths = caches.map((cache) => cache.path);
  } else if (useFzf) {
    selectedPaths = selectCachesWithFzf(caches);
  } else {
    throw new Error(
      [
        "No caches were selected.",
        "Use --all for non-interactive cleanup or run in a TTY with fzf installed.",
      ].join("\n"),
    );
  }

  if (!selectedPaths.length) {
    console.log(chalk.yellow("No VS Code test environments selected."));
    return;
  }

  const selected = caches.filter((cache) => selectedPaths.includes(cache.path));
  const totalBytes = selected.reduce((total, cache) => total + cache.sizeBytes, 0);

  console.log(
    `\nSelected ${selected.length} cache(s), ${chalk.cyan(formatBytes(totalBytes))} total.`,
  );

  if (options.dryRun) {
    const results = removeVscodeTestCaches(caches, selectedPaths, {
      dryRun: true,
    });

    for (const result of results) {
      console.log(
        chalk.yellow(
          `Would remove ${result.path} (${formatBytes(result.sizeBytes)})`,
        ),
      );
    }

    return;
  }

  if (!options.yes) {
    const approved = await confirm({
      message: `Remove ${selected.length} VS Code test environment(s)?`,
      default: false,
    });

    if (!approved) {
      console.log(chalk.yellow("Cleanup cancelled."));
      return;
    }
  }

  const results = removeVscodeTestCaches(caches, selectedPaths);

  for (const result of results) {
    console.log(
      chalk.green(
        `Removed ${result.path} (${formatBytes(result.sizeBytes)})`,
      ),
    );
  }

  console.log(
    chalk.bold(
      `\nFreed ${formatBytes(results.reduce((total, item) => total + item.sizeBytes, 0))}.`,
    ),
  );
}

program
  .name("vscode-test-clean")
  .description(
    "Discover and safely remove VS Code test environments created by @vscode/test-electron.",
  )
  .addOption(
    new Option("-r, --root <directory>", "Directory to scan").default(
      process.cwd(),
    ),
  )
  .option("-a, --all", "Select every discovered .vscode-test environment")
  .option("-j, --json", "Print discovery results as JSON without deleting")
  .option("-d, --dry-run", "Show what would be removed without deleting")
  .option("-y, --yes", "Skip deletion confirmation")
  .option("--no-fzf", "Disable automatic fzf selection")
  .addHelpText(
    "after",
    `
Examples:
  $ vscode-test-clean
  $ vscode-test-clean --all --dry-run
  $ vscode-test-clean --all --yes
  $ vscode-test-clean --json
  $ vscode-test-clean --root ../projects
  $ vscode-test-clean --no-fzf --all --dry-run

Docker:
  $ docker run -it <image> vscode-test-clean
  $ docker run <image> vscode-test-clean --all --yes
`,
  )
  .action(cleanVscodeTestEnvironments);

await program.parseAsync();
