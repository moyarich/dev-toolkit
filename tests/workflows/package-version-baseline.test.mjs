import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "../..");

const packages = [
  "demo-tools",
  "readme-screenshots",
  "vite-plugin-package-bin",
  "vs-code-ext-tools",
  "web-components",
  "workspace-tools",
];

const workspaceNames = new Set(
  packages.map((directory) => {
    const manifest = JSON.parse(
      readFileSync(join(root, "packages", directory, "package.json"), "utf8"),
    );
    return manifest.name;
  }),
);

test("unpublished workspace packages start at 0.0.1", () => {
  for (const directory of packages) {
    const manifest = JSON.parse(
      readFileSync(join(root, "packages", directory, "package.json"), "utf8"),
    );

    assert.equal(
      manifest.version,
      "0.0.1",
      `${manifest.name} should remain at the initial unpublished version`,
    );

    for (const section of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
      for (const [name, version] of Object.entries(manifest[section] ?? {})) {
        if (workspaceNames.has(name)) {
          assert.equal(
            version,
            "0.0.1",
            `${manifest.name} -> ${name} should match the workspace baseline`,
          );
        }
      }
    }
  }
});

test("package-lock workspace entries match 0.0.1", () => {
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));

  for (const directory of packages) {
    const entry = lock.packages[`packages/${directory}`];
    assert.ok(entry, `missing lockfile entry for packages/${directory}`);
    assert.equal(entry.version, "0.0.1");
  }
});
