import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

const workflows = resolve(import.meta.dirname, "../../.github/workflows");

const read = (name: string) => readFileSync(join(workflows, name), "utf8");

const prepare = read("reusable_npm-prepare-release.yml");
const prepareWrapper = read("package-workspace-tools-prepare-release.yml");
const release = read("reusable_npm-release.yml");
const releaseWrapper = read("package-workspace-tools-release.yml");
const publish = read("reusable_npm-publish.yml");
const publishWrapper = read("package-workspace-tools-publish.yml");

test("prepare release creates a PR branch without pushing release tags", () => {
  assert.match(prepare, /target-branch:/);
  assert.match(prepare, /persist-credentials: false/);
  assert.match(
    prepare,
    /PREPARE_BRANCH="prepare-\$\{SAFE_TARGET\}-\$\{SAFE_RELEASE\}-\$\{RUN_ID\}"/,
  );
  assert.match(prepare, /git tag -d "\$TAG"/);
  assert.match(prepare, /gh pr create/);
  assert.match(prepare, /git push .*"HEAD:\$\{PREPARE_BRANCH\}"/);
  assert.doesNotMatch(prepare, /--follow-tags/);
});

test("prepare release uses least privilege and only version-changing modes", () => {
  assert.match(prepare, /permissions: \{\}/);
  assert.match(prepare, /contents: write/);
  assert.match(prepare, /pull-requests: write/);
  assert.match(prepareWrapper, /permissions: \{\}/);
  assert.match(prepareWrapper, /options:\n\s+- bump\n\s+- exact/);
  assert.doesNotMatch(prepareWrapper, /- package-json/);
});

test("release and publish support explicit target branches", () => {
  for (const workflow of [release, publish]) {
    assert.match(workflow, /target-branch:/);
    assert.match(workflow, /ref: \$\{\{ inputs\.target-branch \}\}/);
    assert.match(workflow, /persist-credentials: false/);
    assert.match(workflow, /permissions: \{\}/);
  }

  assert.match(release, /"HEAD:\$\{\{ inputs\.target-branch \}\}"/);
});

test("local mutation workflows use scoped concurrency keys", () => {
  for (const workflow of [prepareWrapper, releaseWrapper, publishWrapper]) {
    assert.match(workflow, /concurrency:/);
    assert.match(workflow, /\$\{\{ github\.workflow \}\}/);
    assert.match(workflow, /\$\{\{ inputs\.target-branch \}\}/);
    assert.match(workflow, /cancel-in-progress: false/);
  }
});

test("reusable release and publish define target-branch once per trigger", () => {
  for (const workflow of [release, publish]) {
    const dispatch = workflow
      .split("  workflow_dispatch:\n")[1]
      .split("  workflow_call:\n")[0];
    const call = workflow
      .split("  workflow_call:\n")[1]
      .split("\npermissions:")[0];

    assert.equal([...dispatch.matchAll(/^ {6}target-branch:/gm)].length, 1);
    assert.equal([...call.matchAll(/^ {6}target-branch:/gm)].length, 1);
  }
});
