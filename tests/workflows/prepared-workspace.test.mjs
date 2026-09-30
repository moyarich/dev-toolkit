import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "../..");
const packageCI = readFileSync(
  join(root, ".github/workflows/reusable_package-ci.yml"),
  "utf8",
);
const nodeCI = readFileSync(
  join(root, ".github/workflows/reusable_node-ci.yml"),
  "utf8",
);

test("package CI no longer prepares or transfers a workspace artifact", () => {
  assert.doesNotMatch(packageCI, /prepare-workspace:/);
  assert.doesNotMatch(packageCI, /upload-artifact/);
  assert.doesNotMatch(packageCI, /prepared-artifact/);
  assert.doesNotMatch(nodeCI, /download-artifact/);
  assert.doesNotMatch(nodeCI, /prepared-artifact/);
});

test("matrix jobs depend only on package discovery", () => {
  assert.match(packageCI, /needs: discover-packages/);
  assert.match(packageCI, /node-version: \$\{\{ inputs\.node-version \}\}/);
});

test("node CI installs dependencies on each runner", () => {
  assert.match(nodeCI, /cache: npm/);
  assert.match(nodeCI, /name: Install workspace dependencies/);
  assert.doesNotMatch(
    nodeCI,
    /if: \$\{\{ inputs\.prepared-artifact == '' \}\}/,
  );
});

test("node CI builds only the selected workspace dependency graph", () => {
  assert.match(
    nodeCI,
    /name: Build selected workspace and local dependencies/,
  );
  assert.match(nodeCI, /item\.manifest\.dependencies/);
  assert.match(nodeCI, /item\.manifest\.devDependencies/);
  assert.match(nodeCI, /item\.manifest\.optionalDependencies/);
  assert.match(
    nodeCI,
    /npm run build --workspace "\$package" --if-present/,
  );
  assert.doesNotMatch(nodeCI, /Build all local packages/);
});
