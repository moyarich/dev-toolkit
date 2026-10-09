import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const workflowDir = resolve(root, ".github/workflows");
const expected = [
  "package-code-mod-jest-to-vitest-publish.yml",
  "package-tests-ci.yml",
  "playground-pages.yml",
  "release-drafter.yml",
  "set-issue-dependencies.yml",
];

test("only dev-toolkit workflow callers live locally", () => {
  const actual = readdirSync(workflowDir)
    .filter((file) => /\.ya?ml$/.test(file))
    .sort();
  assert.deepEqual(actual, [...expected].sort());
});

test("local callers invoke reusable-workflows at v0, never main", () => {
  for (const name of expected) {
    const yaml = readFileSync(resolve(workflowDir, name), "utf8");
    const uses = [
      ...yaml.matchAll(
        /^\s+uses:\s+(moyarich\/reusable-workflows\/\.github\/workflows\/\S+)/gm,
      ),
    ];
    assert.ok(uses.length > 0, `${name} must delegate to reusable-workflows`);
    for (const [, workflow] of uses) {
      assert.match(workflow, /@v0$/);
    }
    assert.doesNotMatch(yaml, /uses:\s+\.\/\.github\/workflows\//);
  }
});
