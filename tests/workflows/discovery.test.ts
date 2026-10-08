import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "vitest";

const workflows = resolve(import.meta.dirname, "../../.github/workflows");
const read = (name: string) => readFileSync(resolve(workflows, name), "utf8");
const discovery = read("reusable_discover-packages.yml");
const packageCI = read("reusable_package-ci.yml");

test("package CI delegates discovery to the reusable entrypoint", () => {
  assert.match(packageCI, /reusable_discover-packages\\.yml/);
  assert.match(packageCI, /require-test-script: true/);
  assert.match(packageCI, /needs: discover-packages/);
});

test("discovery delegates to the canonical workflow, not deleted workspace tools source", () => {
  assert.match(discovery, /moyarich\\/reusable-workflows\\/\\.github\\/workflows\\/reusable_discover-packages\\.yml@main/);
  assert.doesNotMatch(discovery, /packages\\/workspace-tools\\/src/);
  for (const name of ["packages", "matrix", "has-packages", "count"]) {
    assert.match(discovery, new RegExp(`^ {6}${name}:`, "m"));
  }
});
