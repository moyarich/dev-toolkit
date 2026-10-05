import { describe, expect, it } from "vitest";

import {
  buildFilterRepoArgs,
  buildHistoricalTree,
  findHistoricalNode,
  formatBytes,
  listHistoricalChildren,
  normalizeRemovalPaths,
  parseHistoricalBlobLine,
  selectionState,
} from "../src/index.ts";

describe("historical Git tree", () => {
  it("parses git cat-file blob rows including paths with spaces", () => {
    expect(
      parseHistoricalBlobLine(
        "blob abc123 2048 packages/demo folder/file name.png",
      ),
    ).toEqual({
      hash: "abc123",
      size: 2048,
      path: "packages/demo folder/file name.png",
    });
  });

  it("aggregates historical sizes into virtual directories", () => {
    const root = buildHistoricalTree([
      { hash: "a", size: 100, path: "packages/a/file.txt" },
      { hash: "b", size: 250, path: "packages/a/video.mov" },
      { hash: "c", size: 50, path: "README.md" },
    ]);

    const packages = findHistoricalNode(root, "packages/");
    const packageA = findHistoricalNode(root, "packages/a/");
    const video = findHistoricalNode(root, "packages/a/video.mov");

    expect(root.size).toBe(400);
    expect(packages?.size).toBe(350);
    expect(packageA?.size).toBe(350);
    expect(packageA?.largestBlob).toBe(250);
    expect(video?.size).toBe(250);
  });

  it("sorts directories before files and larger entries first", () => {
    const root = buildHistoricalTree([
      { hash: "a", size: 10, path: "small/file.txt" },
      { hash: "b", size: 100, path: "large/file.txt" },
      { hash: "c", size: 999, path: "root.bin" },
    ]);

    expect(listHistoricalChildren(root).map((node) => node.name)).toEqual([
      "large",
      "small",
      "root.bin",
    ]);
  });
});

describe("multi-selection", () => {
  it("removes redundant descendants when a directory is selected", () => {
    expect(
      normalizeRemovalPaths([
        "packages/a/file.txt",
        "packages/a/",
        "packages/a/nested/image.png",
        "README.md",
      ]),
    ).toEqual(["README.md", "packages/a/"]);
  });

  it("marks descendants as covered by selected directories", () => {
    const selected = new Set(["packages/a/"]);

    expect(selectionState("packages/a/", selected)).toBe("selected");
    expect(selectionState("packages/a/file.txt", selected)).toBe("covered");
    expect(selectionState("packages/b/file.txt", selected)).toBe("none");
  });

  it("builds one git filter-repo invocation for multiple paths", () => {
    expect(
      buildFilterRepoArgs([
        "assets/old.mov",
        "packages/a/file.txt",
        "packages/a/",
      ]),
    ).toEqual([
      "filter-repo",
      "--path",
      "assets/old.mov",
      "--path",
      "packages/a/",
      "--invert-paths",
      "--force",
    ]);
  });
});

describe("formatBytes", () => {
  it("formats binary sizes", () => {
    expect(formatBytes(1024)).toBe("1.00 KiB");
    expect(formatBytes(1024 * 1024 * 10)).toBe("10.0 MiB");
  });
});
