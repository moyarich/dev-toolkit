import { execFileSync, spawnSync } from "node:child_process";

import {
  buildFilterRepoArgs,
  normalizeRemovalPaths,
  parseHistoricalBlobLine,
  type HistoricalBlob,
} from "./index.ts";

const MAX_BUFFER = 1024 * 1024 * 1024;

export interface RewriteOptions {
  dryRun: boolean;
  remote: string;
  remoteUrl?: string;
}

export function runGit(args: string[], capture = false): string {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      maxBuffer: MAX_BUFFER,
    });
  } catch (error) {
    if (
      capture &&
      typeof error === "object" &&
      error !== null &&
      "stderr" in error &&
      typeof error.stderr === "string"
    ) {
      process.stderr.write(error.stderr);
    }

    throw error;
  }
}

export function runGitOptional(args: string[]): string {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    maxBuffer: MAX_BUFFER,
  });

  return result.status === 0 ? result.stdout ?? "" : "";
}

export function assertGitRepository(): void {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    stdio: "ignore",
  });

  if (result.status !== 0) {
    throw new Error("Current directory is not inside a Git repository.");
  }
}

export function assertGitFilterRepo(): void {
  const result = spawnSync("git", ["filter-repo", "--version"], {
    stdio: "ignore",
  });

  if (result.status !== 0) {
    throw new Error(
      [
        "git-filter-repo is required.",
        "Install it with: brew install git-filter-repo",
        "Or: pipx install git-filter-repo",
      ].join("\n"),
    );
  }
}

export function getHistoricalBlobs(): HistoricalBlob[] {
  const objects = runGit(["rev-list", "--objects", "--all"], true);
  if (!objects.trim()) return [];

  const result = spawnSync(
    "git",
    [
      "cat-file",
      "--batch-check=%(objecttype) %(objectname) %(objectsize) %(rest)",
    ],
    {
      encoding: "utf8",
      input: objects,
      maxBuffer: MAX_BUFFER,
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || "git cat-file failed.");
  }

  return (result.stdout ?? "")
    .split("\n")
    .map(parseHistoricalBlobLine)
    .filter((blob): blob is HistoricalBlob => Boolean(blob));
}

export function getRemoteUrl(remote: string): string | undefined {
  return runGitOptional(["remote", "get-url", remote]).trim() || undefined;
}

export function materializeRemoteBranches(remote: string): void {
  const currentBranch = runGitOptional(["branch", "--show-current"]).trim();
  const refs = runGitOptional([
    "for-each-ref",
    "--format=%(refname:strip=3)",
    "refs/remotes/" + remote,
  ]);

  for (const branch of refs.split("\n").map((value) => value.trim())) {
    if (!branch || branch === "HEAD" || branch === currentBranch) continue;

    runGit([
      "branch",
      "--force",
      branch,
      "refs/remotes/" + remote + "/" + branch,
    ]);
  }
}

export function verifyRemovedPaths(paths: Iterable<string>): void {
  const selected = normalizeRemovalPaths(paths);
  const objects = runGit(["rev-list", "--objects", "--all"], true);

  const remaining = objects
    .split("\n")
    .map((line) => {
      const space = line.indexOf(" ");
      return space === -1 ? "" : line.slice(space + 1);
    })
    .filter(Boolean)
    .filter((objectPath) =>
      selected.some((selectedPath) => {
        if (selectedPath.endsWith("/")) {
          return objectPath.startsWith(selectedPath);
        }

        return objectPath === selectedPath;
      }),
    );

  if (remaining.length > 0) {
    throw new Error(
      "Historical objects still reference selected paths:\n" +
        remaining.slice(0, 20).join("\n"),
    );
  }
}

export function rewriteHistory(
  paths: Iterable<string>,
  options: RewriteOptions,
): void {
  const selected = normalizeRemovalPaths(paths);
  if (!selected.length) {
    throw new Error("At least one repository-relative path is required.");
  }

  assertGitRepository();
  assertGitFilterRepo();

  const remoteUrl = options.remoteUrl ?? getRemoteUrl(options.remote);
  if (!options.dryRun && !remoteUrl) {
    throw new Error(
      'Cannot determine URL for remote "' +
        options.remote +
        '". Pass --remote-url <url>.',
    );
  }

  materializeRemoteBranches(options.remote);
  runGit(buildFilterRepoArgs(selected));
  verifyRemovedPaths(selected);

  runGitOptional(["reflog", "expire", "--expire=now", "--all"]);
  runGit(["gc", "--prune=now", "--aggressive"]);

  if (remoteUrl) {
    runGitOptional(["remote", "remove", options.remote]);
    runGit(["remote", "add", options.remote, remoteUrl]);
  }

  if (!options.dryRun) {
    runGit(["push", "--force", "--all", options.remote]);
    runGit(["push", "--force", "--tags", options.remote]);
  }
}
