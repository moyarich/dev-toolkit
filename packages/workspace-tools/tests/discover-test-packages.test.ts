import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";

import { discoverTestPackages } from "../src/discover-test-packages.ts";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "discover-test-packages-"));
  async function pkg(directory: string, manifest: object) {
    const path = join(root, directory);
    await mkdir(path, { recursive: true });
    await writeFile(join(path, "package.json"), JSON.stringify(manifest));
  }
  return { root, pkg };
}

test("discovers test packages sorted by package name", async () => {
  const { root, pkg } = await fixture();
  try {
    await pkg("zeta", { name: "@example/zeta", scripts: { test: "vitest run" } });
    await pkg("alpha", { name: "@example/alpha", scripts: { test: "node test.js" } });
    await pkg("docs", { name: "@example/docs", scripts: { build: "vite build" } });
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
    await assert.rejects(() => discoverTestPackages(root), SyntaxError);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
