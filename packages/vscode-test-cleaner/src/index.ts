import {
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";

/**
 * A discovered VS Code test cache.
 */
export interface VscodeTestCache {
  path: string;
  sizeBytes: number;
}

/**
 * Options controlling recursive cache discovery.
 */
export interface DiscoverOptions {
  ignoredDirectories?: Iterable<string>;
}

/**
 * Result returned for a requested cache removal.
 */
export interface RemovalResult {
  path: string;
  sizeBytes: number;
  removed: boolean;
  dryRun: boolean;
}

const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
]);

/**
 * Calculate the recursive size of a file-system path.
 *
 * Symbolic links are counted by their own stat size and are not traversed.
 *
 * @param path File or directory to measure.
 * @returns Total size in bytes.
 */
export function pathSize(path: string): number {
  const stat = statSync(path, { throwIfNoEntry: false });

  if (!stat) return 0;
  if (!stat.isDirectory()) return stat.size;

  return readdirSync(path, { withFileTypes: true }).reduce(
    (total, entry) => {
      const child = resolve(path, entry.name);

      if (entry.isSymbolicLink()) {
        return total + (statSync(child, { throwIfNoEntry: false })?.size ?? 0);
      }

      return total + pathSize(child);
    },
    0,
  );
}

/**
 * Format bytes for human-readable terminal output.
 *
 * @param bytes Number of bytes.
 * @returns Human-readable size.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[index]}`;
}

/**
 * Recursively discover directories named `.vscode-test`.
 *
 * Discovery does not descend into a cache after finding it and skips
 * `.git` and `node_modules` by default.
 *
 * @param root Directory to scan.
 * @param options Discovery options.
 * @returns Discovered caches sorted by path.
 */
export function discoverVscodeTestCaches(
  root: string,
  options: DiscoverOptions = {},
): VscodeTestCache[] {
  const ignored = new Set([
    ...DEFAULT_IGNORED_DIRECTORIES,
    ...(options.ignoredDirectories ?? []),
  ]);

  const discovered: VscodeTestCache[] = [];

  function visit(directory: string): void {
    let entries;

    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      if (ignored.has(entry.name)) continue;

      const child = resolve(directory, entry.name);

      if (entry.name === ".vscode-test") {
        discovered.push({
          path: child,
          sizeBytes: pathSize(child),
        });
        continue;
      }

      visit(child);
    }
  }

  visit(resolve(root));

  return discovered.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Remove selected VS Code test caches.
 *
 * Every selected path must exactly match a discovered candidate. This prevents
 * arbitrary paths from being passed directly into the deletion operation.
 *
 * @param candidates Caches returned by discovery.
 * @param selectedPaths Paths selected for removal.
 * @param options Removal options.
 * @returns Removal results.
 */
export function removeVscodeTestCaches(
  candidates: VscodeTestCache[],
  selectedPaths: Iterable<string>,
  options: { dryRun?: boolean } = {},
): RemovalResult[] {
  const candidateByPath = new Map(
    candidates.map((candidate) => [resolve(candidate.path), candidate]),
  );

  const uniqueSelected = [...new Set([...selectedPaths].map((path) => resolve(path)))];

  return uniqueSelected.map((path) => {
    const candidate = candidateByPath.get(path);

    if (!candidate) {
      throw new Error(
        `Refusing to remove undiscovered VS Code test cache: ${path}`,
      );
    }

    if (!options.dryRun) {
      rmSync(candidate.path, {
        recursive: true,
        force: true,
      });
    }

    return {
      ...candidate,
      removed: !options.dryRun,
      dryRun: Boolean(options.dryRun),
    };
  });
}

/**
 * Determine whether fzf can be enabled automatically.
 *
 * @param options Runtime capability state.
 * @returns Whether fzf interaction should be used.
 */
export function canUseFzf(options: {
  enabled?: boolean;
  stdinIsTTY?: boolean;
  stdoutIsTTY?: boolean;
  fzfAvailable?: boolean;
}): boolean {
  return Boolean(
    options.enabled !== false &&
      options.stdinIsTTY &&
      options.stdoutIsTTY &&
      options.fzfAvailable,
  );
}
