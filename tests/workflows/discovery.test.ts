import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "vitest";
const workflows = resolve(import.meta.dirname, "../../.github/workflows");
const read = (name: string) => readFileSync(resolve(workflows, name), "utf8");
test("package CI uses canonical reusable discovery and preserves its outputs", () => {
  const ci = read("reusable_package-ci.yml");
  assert.match(ci, /moyarich\/reusable-workflows\/\.github\/workflows\/reusable_discover-packages\.yml@main/);
  assert.match(ci, /require-test-script: true/);
  assert.match(ci, /needs: discover-packages/);
  assert.match(ci, /fromJSON\(needs\.discover-packages\.outputs\.matrix/);
});
test("release drafter uses canonical reusable discovery", () => {
  const draft = read("release-drafter.yml");
  assert.match(draft, /moyarich\/reusable-workflows\/\.github\/workflows\/reusable_discover-packages\.yml@main/);
});
