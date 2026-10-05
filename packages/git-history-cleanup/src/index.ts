export interface HistoricalBlob {
  hash: string;
  size: number;
  path: string;
}

export interface HistoricalNodeBase {
  name: string;
  path: string;
  size: number;
  blobCount: number;
  largestBlob: number;
}

export interface HistoricalFileNode extends HistoricalNodeBase {
  type: "file";
  blobs: HistoricalBlob[];
}

export interface HistoricalDirectoryNode extends HistoricalNodeBase {
  type: "directory";
  children: Map<string, HistoricalNode>;
}

export type HistoricalNode = HistoricalFileNode | HistoricalDirectoryNode;

export function parseHistoricalBlobLine(line: string): HistoricalBlob | null {
  const match = line.match(/^blob ([0-9a-f]+) (\d+)(?: (.*))?$/);

  if (!match || !match[3]) return null;

  return {
    hash: match[1],
    size: Number(match[2]),
    path: match[3],
  };
}

export function createDirectory(
  name: string,
  path = "",
): HistoricalDirectoryNode {
  return {
    type: "directory",
    name,
    path,
    size: 0,
    blobCount: 0,
    largestBlob: 0,
    children: new Map(),
  };
}

export function buildHistoricalTree(
  blobs: HistoricalBlob[],
): HistoricalDirectoryNode {
  const root = createDirectory("/", "");

  for (const blob of blobs) {
    const parts = blob.path.split("/").filter(Boolean);
    if (!parts.length) continue;

    let directory = root;
    addBlobStats(directory, blob.size);

    for (let index = 0; index < parts.length; index += 1) {
      const name = parts[index];
      const isFile = index === parts.length - 1;
      const path = parts.slice(0, index + 1).join("/");

      if (isFile) {
        const existing = directory.children.get(name);
        let file: HistoricalFileNode;

        if (existing?.type === "file") {
          file = existing;
        } else {
          file = {
            type: "file",
            name,
            path,
            size: 0,
            blobCount: 0,
            largestBlob: 0,
            blobs: [],
          };
          directory.children.set(name, file);
        }

        addBlobStats(file, blob.size);
        file.blobs.push(blob);
        continue;
      }

      const existing = directory.children.get(name);
      let child: HistoricalDirectoryNode;

      if (existing?.type === "directory") {
        child = existing;
      } else {
        child = createDirectory(name, path + "/");
        directory.children.set(name, child);
      }

      addBlobStats(child, blob.size);
      directory = child;
    }
  }

  return root;
}

function addBlobStats(node: HistoricalNode, size: number): void {
  node.size += size;
  node.blobCount += 1;
  node.largestBlob = Math.max(node.largestBlob, size);
}

export function findHistoricalNode(
  root: HistoricalDirectoryNode,
  requestedPath: string,
): HistoricalNode | null {
  const normalized = requestedPath.replace(/^\.\//, "").replace(/\/+$/, "");
  if (!normalized) return root;

  let current: HistoricalNode = root;

  for (const part of normalized.split("/").filter(Boolean)) {
    if (current.type !== "directory") return null;
    const child = current.children.get(part);
    if (!child) return null;
    current = child;
  }

  return current;
}

export function listHistoricalChildren(
  directory: HistoricalDirectoryNode,
  query = "",
): HistoricalNode[] {
  const normalizedQuery = query.trim().toLowerCase();

  return [...directory.children.values()]
    .filter((node) =>
      normalizedQuery
        ? node.name.toLowerCase().includes(normalizedQuery)
        : true,
    )
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "directory" ? -1 : 1;
      }

      if (right.size !== left.size) return right.size - left.size;
      return left.name.localeCompare(right.name);
    });
}

export function normalizeRemovalPaths(paths: Iterable<string>): string[] {
  const normalized = [...new Set(paths)]
    .map((path) => path.replace(/^\.\//, ""))
    .filter(Boolean)
    .sort(
      (left, right) => left.length - right.length || left.localeCompare(right),
    );

  const result: string[] = [];

  for (const path of normalized) {
    if (result.some((selected) => pathCoveredBySelection(path, selected))) {
      continue;
    }

    result.push(path);
  }

  return result;
}

export function pathCoveredBySelection(
  candidatePath: string,
  selectedPath: string,
): boolean {
  if (candidatePath === selectedPath) return true;
  if (!selectedPath.endsWith("/")) return false;
  return candidatePath.startsWith(selectedPath);
}

export function selectionState(
  nodePath: string,
  selectedPaths: ReadonlySet<string>,
): "selected" | "covered" | "none" {
  if (selectedPaths.has(nodePath)) return "selected";

  for (const selectedPath of selectedPaths) {
    if (pathCoveredBySelection(nodePath, selectedPath)) {
      return "covered";
    }
  }

  return "none";
}

export function buildFilterRepoArgs(paths: Iterable<string>): string[] {
  const normalized = normalizeRemovalPaths(paths);

  return [
    "filter-repo",
    ...normalized.flatMap((path) => ["--path", path]),
    "--invert-paths",
    "--force",
  ];
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";

  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return value.toFixed(digits) + " " + units[unitIndex];
}
