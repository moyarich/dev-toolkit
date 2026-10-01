import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "vitest";

const repo = resolve(import.meta.dirname, "../..");
const packageCI = readFileSync(
  join(repo, ".github/workflows/reusable_package-ci.yml"),
  "utf8",
);
const discovery = readFileSync(
  join(repo, ".github/workflows/reusable_discover-packages.yml"),
  "utf8",
);

test("package CI delegates discovery to the reusable workflow", () => {
  assert.match(
    packageCI,
    /uses: \.\/\.github\/workflows\/reusable_discover-packages\.yml/,
  );
  assert.match(packageCI, /require-test-script: true/);
  assert.match(packageCI, /needs: discover-packages/);
  assert.match(
    packageCI,
    /fromJSON\(needs\.discover-packages\.outputs\.matrix/,
  );
});

test("reusable discovery builds the CLI from the tracked TypeScript source", () => {
  assert.match(
    discovery,
    /packages\/workspace-tools\/src\/discover-packages\.ts/,
  );
  assert.match(discovery, /stripTypeScriptTypes/);
  assert.match(discovery, /DISCOVERY_CLI=/);
  assert.match(discovery, /node "\$DISCOVERY_CLI"/);
  assert.doesNotMatch(discovery, /@moyarich\/workspace-tools@latest/);
  assert.doesNotMatch(discovery, /npm install/);
});

test("reusable discovery exposes package metadata for callers", () => {
  assert.match(discovery, /workflow_call:/);
  assert.match(discovery, /packages:/);
  assert.match(discovery, /matrix:/);
  assert.match(discovery, /has-packages:/);
  assert.match(discovery, /count:/);
  assert.match(discovery, /require-publish-config:/);
  assert.match(discovery, /require-test-script:/);
  assert.match(discovery, /require-build-script:/);
});
