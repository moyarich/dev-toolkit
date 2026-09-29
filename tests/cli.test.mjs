import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const commands = [
  "packages/demo-tools/bin/demo.mjs",
  "packages/demo-tools/bin/demo-strategy.mjs",
  "packages/workspace-tools/bin/workspace-release.mjs",
  "packages/workspace-tools/bin/workspace-publish.mjs",
  "packages/readme-screenshots/bin/readme-screenshots.mjs",
  "packages/vs-code-ext-tools/src/confirm-publish.mjs",
  "scripts/discover-test-packages.mjs",
];

function invoke(script, ...args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 15_000,
  });
}

for (const command of commands) {
  test(`${command} shows help without running its action`, () => {
    const result = invoke(command, "--help");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /--help/);
  });

  test(`${command} rejects unknown flags before running its action`, () => {
    const result = invoke(command, "--not-a-real-option");
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /unknown option/);
  });
}

test("package discovery preserves its default directory and JSON output", () => {
  const implicit = invoke("scripts/discover-test-packages.mjs");
  const explicit = invoke("scripts/discover-test-packages.mjs", "packages");
  assert.equal(implicit.status, 0, implicit.stderr);
  assert.equal(explicit.status, 0, explicit.stderr);
  assert.deepEqual(JSON.parse(implicit.stdout), JSON.parse(explicit.stdout));
  assert.ok(JSON.parse(implicit.stdout).some((pkg) => pkg.name === "@moyarich/workspace-tools"));
});

test("release accepts both separated and equals option values", () => {
  for (const args of [["--mode=exact", "--version=invalid"], ["--mode", "exact", "--version", "invalid"]]) {
    const result = invoke("packages/workspace-tools/bin/workspace-release.mjs", "workspace-tools=patch", "--dry-run", ...args);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Invalid exact SemVer: invalid/);
  }
});

test("publish retains validation of explicit boolean values", () => {
  const result = invoke("packages/workspace-tools/bin/workspace-publish.mjs", "--dry-run=invalid");
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Boolean options must be true or false/);
});
