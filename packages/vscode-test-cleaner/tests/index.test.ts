import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  canUseFzf,
  discoverVscodeTestCaches,
  formatBytes,
  removeVscodeTestCaches,
} from "../src/index.ts";

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "vscode-test-cleaner-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  const { rmSync } = await import("node:fs");

  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
});

describe("discoverVscodeTestCaches", () => {
  it("discovers nested .vscode-test directories and reports their size", () => {
    const root = temporaryDirectory();
    const cache = resolve(root, "packages", "extension", ".vscode-test");

    mkdirSync(cache, { recursive: true });
    writeFileSync(resolve(cache, "fixture.bin"), Buffer.alloc(128));

    expect(discoverVscodeTestCaches(root)).toEqual([
      {
        path: cache,
        sizeBytes: 128,
      },
    ]);
  });

  it("does not scan node_modules or .git", () => {
    const root = temporaryDirectory();

    mkdirSync(resolve(root, "node_modules", "x", ".vscode-test"), {
      recursive: true,
    });
    mkdirSync(resolve(root, ".git", "x", ".vscode-test"), {
      recursive: true,
    });

    expect(discoverVscodeTestCaches(root)).toEqual([]);
  });
});

describe("removeVscodeTestCaches", () => {
  it("supports dry runs without deleting", () => {
    const root = temporaryDirectory();
    const cache = resolve(root, ".vscode-test");

    mkdirSync(cache);

    const candidates = discoverVscodeTestCaches(root);
    const [result] = removeVscodeTestCaches(candidates, [cache], {
      dryRun: true,
    });

    expect(result?.removed).toBe(false);
    expect(existsSync(cache)).toBe(true);
  });

  it("deletes discovered caches", () => {
    const root = temporaryDirectory();
    const cache = resolve(root, ".vscode-test");

    mkdirSync(cache);

    const candidates = discoverVscodeTestCaches(root);
    const [result] = removeVscodeTestCaches(candidates, [cache]);

    expect(result?.removed).toBe(true);
    expect(existsSync(cache)).toBe(false);
  });

  it("rejects arbitrary paths that were not discovered", () => {
    const root = temporaryDirectory();
    const arbitrary = resolve(root, "important");

    mkdirSync(arbitrary);

    expect(() =>
      removeVscodeTestCaches([], [arbitrary]),
    ).toThrow(/Refusing to remove undiscovered/);

    expect(existsSync(arbitrary)).toBe(true);
  });
});

describe("canUseFzf", () => {
  it("requires both TTY streams and the fzf executable", () => {
    expect(
      canUseFzf({
        stdinIsTTY: true,
        stdoutIsTTY: true,
        fzfAvailable: true,
      }),
    ).toBe(true);

    expect(
      canUseFzf({
        stdinIsTTY: false,
        stdoutIsTTY: true,
        fzfAvailable: true,
      }),
    ).toBe(false);

    expect(
      canUseFzf({
        stdinIsTTY: true,
        stdoutIsTTY: true,
        fzfAvailable: false,
      }),
    ).toBe(false);
  });

  it("can be explicitly disabled", () => {
    expect(
      canUseFzf({
        enabled: false,
        stdinIsTTY: true,
        stdoutIsTTY: true,
        fzfAvailable: true,
      }),
    ).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formats common byte sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
  });
});
