#!/usr/bin/env node

import { confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { Command, Option } from "commander";

import {
  buildHistoricalTree,
  findHistoricalNode,
  formatBytes,
  type HistoricalDirectoryNode,
  type HistoricalNode,
} from "../index.ts";
import {
  assertGitRepository,
  getHistoricalBlobs,
  rewriteHistory,
} from "../git.ts";
import { browseHistoricalTree } from "../tui.ts";

interface InspectOptions {
  limit: string;
  json?: boolean;
}

interface BrowseOptions {
  remote: string;
  remoteUrl?: string;
  dryRun: boolean;
}

interface RemoveOptions extends BrowseOptions {
  yes?: boolean;
}

const program = new Command();

program
  .name("git-history-cleanup")
  .description(
    "Inspect, browse, and remove repository-relative paths from reachable Git history.",
  );

program
  .command("inspect")
  .description("List the largest reachable historical blobs.")
  .argument("[path]", "Limit results to a repository-relative path")
  .addOption(
    new Option("-n, --limit <number>", "Number of blobs to print").default(
      "50",
    ),
  )
  .option("--json", "Print machine-readable JSON")
  .action((path: string | undefined, options: InspectOptions) => {
    assertGitRepository();

    const limit = Number.parseInt(options.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new Error("--limit must be a positive integer.");
    }

    const prefix = path?.replace(/^\.\//, "").replace(/\/+$/, "");
    const blobs = getHistoricalBlobs()
      .filter((blob) =>
        prefix
          ? blob.path === prefix || blob.path.startsWith(prefix + "/")
          : true,
      )
      .sort((left, right) => right.size - left.size)
      .slice(0, limit);

    if (options.json) {
      console.log(JSON.stringify(blobs, null, 2));
      return;
    }

    for (const blob of blobs) {
      console.log(
        blob.hash + " " + String(blob.size).padStart(12) + " " + blob.path,
      );
    }
  });

program
  .command("browse")
  .description(
    "Browse reachable Git history as a virtual filesystem and multi-select paths.",
  )
  .argument("[path]", "Repository-relative directory to open first")
  .addOption(new Option("--remote <name>", "Git remote").default("origin"))
  .option("--remote-url <url>", "Explicit remote URL to restore after rewrite")
  .option(
    "--dry-run",
    "Rewrite locally but do not force-push rewritten refs",
    true,
  )
  .option("--no-dry-run", "Rewrite and force-push branches and tags")
  .action(async (path: string | undefined, options: BrowseOptions) => {
    assertGitRepository();

    const root = buildHistoricalTree(getHistoricalBlobs());
    const requested = path ? findHistoricalNode(root, path) : root;

    if (!requested) {
      throw new Error('Historical path not found: "' + path + '".');
    }

    const start: HistoricalDirectoryNode =
      requested.type === "directory"
        ? requested
        : findParentDirectory(root, requested);

    const result = await browseHistoricalTree(start);
    if (result.action !== "rewrite") return;

    if (!result.paths.length) {
      console.log(chalk.yellow("No historical paths selected."));
      return;
    }

    printSelected(result.paths);

    const approved = await confirm({
      message:
        "Rewrite local Git history and remove " +
        result.paths.length +
        " selected path(s)?",
      default: false,
    });

    if (!approved) {
      console.log(chalk.yellow("History rewrite cancelled."));
      return;
    }

    rewriteHistory(result.paths, options);
    printRewriteResult(options.dryRun);
  });

program
  .command("remove")
  .description("Remove one or more paths from all reachable Git history.")
  .argument("<paths...>", "Repository-relative file or directory paths")
  .addOption(new Option("--remote <name>", "Git remote").default("origin"))
  .option("--remote-url <url>", "Explicit remote URL to restore after rewrite")
  .option(
    "--dry-run",
    "Rewrite locally but do not force-push rewritten refs",
    true,
  )
  .option("--no-dry-run", "Rewrite and force-push branches and tags")
  .option("-y, --yes", "Skip the local history rewrite confirmation")
  .action(async (paths: string[], options: RemoveOptions) => {
    printSelected(paths);

    if (!options.yes) {
      const approved = await confirm({
        message:
          "Rewrite local Git history and remove " +
          paths.length +
          " selected path(s)?",
        default: false,
      });

      if (!approved) {
        console.log(chalk.yellow("History rewrite cancelled."));
        return;
      }
    }

    rewriteHistory(paths, options);
    printRewriteResult(options.dryRun);
  });

program.addHelpText(
  "after",
  [
    "",
    "Examples:",
    "  $ git-history-cleanup inspect",
    "  $ git-history-cleanup inspect packages/ --limit 100",
    "  $ git-history-cleanup browse",
    "  $ git-history-cleanup browse packages/",
    "  $ git-history-cleanup remove packages/visualize-css-colors/ --yes",
    "  $ git-history-cleanup remove assets/old-demo.mov --no-dry-run --yes",
    "",
    "Dry-run semantics:",
    "  --dry-run still rewrites the local clone. It only prevents force-pushing",
    "  rewritten branches and tags to the remote.",
  ].join("\n"),
);

await program.parseAsync();

function findParentDirectory(
  root: HistoricalDirectoryNode,
  node: HistoricalNode,
): HistoricalDirectoryNode {
  const parts = node.path.split("/").filter(Boolean);
  parts.pop();

  const parentPath = parts.join("/");
  const parent = findHistoricalNode(root, parentPath);

  if (!parent || parent.type !== "directory") return root;
  return parent;
}

function printSelected(paths: string[]): void {
  console.log(chalk.bold("\nSelected historical paths"));

  for (const path of paths) {
    console.log("  " + chalk.cyan(path));
  }
}

function printRewriteResult(dryRun: boolean): void {
  console.log();

  if (dryRun) {
    console.log(
      chalk.yellow(
        "Local history was rewritten. Remote refs were not changed.",
      ),
    );
    return;
  }

  console.log(chalk.green("Rewritten branches and tags were force-pushed."));
  console.log(
    chalk.yellow("Existing clones should be discarded and re-cloned."),
  );
}
