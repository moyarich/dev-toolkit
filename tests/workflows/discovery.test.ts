import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "vitest";

const workflows = resolve(import.meta.dirname, "../../.github/workflows");
const read = (name: string) => readFileSync(resolve(workflows, name), "utf8");

test("package CI delegates package discovery", () => {
  const ci = read("reusable_package-ci.yml");
  assert.match(ci, /reusable_discover-packages\.yml/);
  assert.match(ci, /require-test-script: true/);
});

test("discovery retrieves its CLI from the owning repository", () => {
  const discovery = read("reusable_discover-packages.yml");
  assert.ok(discovery.includes("repository: moyarich/workspace-tools"));
  assert.ok(discovery.includes("sparse-checkout: src/discover-packages.ts"));
  assert.match(discovery, /stripTypeScriptTypes/);
  assert.ok(!discovery.includes("test -f packages/workspace-tools"));
});
