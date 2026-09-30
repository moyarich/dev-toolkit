import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";

import { discoverTestPackages } from "../src/discover-test-packages.ts";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "discover-test-packages-"));
  execFileSync("git", ["init", "-q", root]);
  async function pkg(directory: string, manifest: object, tracked = true) {
    const path = join(root, directory);
    await mkdir(path, { recursive: true });
    await writeFile(join(path, "package.json"), JSON.stringify(manifest));
    if (tracked)
      execFileSync("git", ["add", "--", `${directory}/package.json`], {
        cwd: root,
      });
  }
  return { root, pkg };
}

test("discovers test packages sorted by package name", async () => {
  const { root, pkg } = await fixture();
  try {
    await pkg("zeta", {
      name: "@example/zeta",
      scripts: { test: "vitest run" },
    });
    await pkg("alpha", {
      name: "@example/alpha",
      scripts: { test: "node test.js" },
    });
    await pkg("docs", {
      name: "@example/docs",
      scripts: { build: "vite build" },
    });
    assert.deepEqual(await discoverTestPackages(root), [
      { directory: join(root, "alpha"), name: "@example/alpha" },
      { directory: join(root, "zeta"), name: "@example/zeta" },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("uses directory name when package name is missing", async () => {
  const { root, pkg } = await fixture();
  try {
    await pkg("unnamed", { scripts: { test: "vitest run" } });
    assert.deepEqual(await discoverTestPackages(root), [
      { directory: join(root, "unnamed"), name: "unnamed" },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ignores directories without package.json", async () => {
  const { root } = await fixture();
  try {
    await mkdir(join(root, "not-a-package"));
    assert.deepEqual(await discoverTestPackages(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("surfaces malformed package manifests", async () => {
  const { root } = await fixture();
  try {
    const directory = join(root, "broken");
    await mkdir(directory);
    await writeFile(join(directory, "package.json"), "{ invalid json");
    execFileSync("git", ["add", "broken/package.json"], { cwd: root });
    await assert.rejects(() => discoverTestPackages(root), SyntaxError);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("only discovers tracked direct-child manifests and excludes installed dependencies", async () => {
  const { root, pkg } = await fixture();
  try {
    await writeFile(join(root, ".gitignore"), "ignored/\nnode_modules/\n");
    await pkg("tracked", { name: "tracked", scripts: { test: "test" } });
    await pkg("untracked", { scripts: { test: "test" } }, false);
    await pkg("ignored", { scripts: { test: "test" } }, false);
    await pkg("nested/deeper", { scripts: { test: "test" } });
    await pkg("node_modules", { scripts: { test: "test" } }, false);
    await pkg("node_modules/dependency", { scripts: { test: "test" } }, false);
    // Even accidentally tracked dependencies must not enter the CI matrix.
    execFileSync("git", ["add", "-f", "node_modules"], { cwd: root });
    assert.deepEqual(await discoverTestPackages(root), [
      { directory: join(root, "tracked"), name: "tracked" },
    ]);
    assert.deepEqual(
      await discoverTestPackages(join(root, "node_modules")),
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ignores a tracked manifest deleted from the checkout", async () => {
  const { root, pkg } = await fixture();
  try {
    await pkg("deleted", { scripts: { test: "test" } });
    await rm(join(root, "deleted"), { recursive: true });
    assert.deepEqual(await discoverTestPackages(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
