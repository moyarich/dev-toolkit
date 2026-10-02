import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "vitest";

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

test("manual runs use GitHub's selected ref while reusable calls support target-branch", () => {
  for (const [name, workflow] of [
    ["release", release],
    ["publish", publish],
  ] as const) {
    const dispatch = workflow
      .split("  workflow_dispatch:\n")[1]
      .split("  workflow_call:\n")[0];
    const call = workflow
      .split("  workflow_call:\n")[1]
      .split("\npermissions:")[0];

    assert.doesNotMatch(
      dispatch,
      /^ {6}target-branch:/m,
      `${name} manual dispatch should rely on GitHub's built-in branch selector`,
    );
    assert.match(
      call,
      /^ {6}target-branch:/m,
      `${name} reusable workflow should define target-branch`,
    );
    assert.match(
      workflow,
      /TARGET_BRANCH: \$\{\{ github\.event_name == 'workflow_dispatch' && github\.ref_name \|\| inputs\.target-branch \}\}/,
      `${name} should resolve one effective target branch`,
    );
    assert.match(
      workflow,
      /ref: \$\{\{ env\.TARGET_BRANCH \}\}/,
      `${name} checkout should use the resolved target branch`,
    );
    assert.match(
      workflow,
      /persist-credentials: false/,
      `${name} checkout should disable persisted credentials`,
    );
    assert.match(
      workflow,
      /^permissions: \{\}$/m,
      `${name} should default to no workflow-level permissions`,
    );
  }

  assert.match(
    release,
    /git push origin\s+\\\s*"HEAD:\$\{TARGET_BRANCH\}"\s+\\\s*--follow-tags/,
    "release should push the release commit and tags to the resolved target branch",
  );
});

test("local mutation workflows use scoped concurrency keys", () => {
  for (const workflow of [prepareWrapper, releaseWrapper, publishWrapper]) {
    assert.match(workflow, /concurrency:/);
    assert.match(workflow, /\$\{\{ github\.workflow \}\}/);
    assert.match(workflow, /\$\{\{ inputs\.target-branch \}\}/);
    assert.match(workflow, /cancel-in-progress: false/);
  }
});

test("reusable release and publish define target-branch only for workflow_call", () => {
  for (const workflow of [release, publish]) {
    const dispatch = workflow
      .split("  workflow_dispatch:\n")[1]
      .split("  workflow_call:\n")[0];
    const call = workflow
      .split("  workflow_call:\n")[1]
      .split("\npermissions:")[0];

    assert.equal([...dispatch.matchAll(/^ {6}target-branch:/gm)].length, 0);
    assert.equal([...call.matchAll(/^ {6}target-branch:/gm)].length, 1);
  }
});

test("release workflow keeps GitHub releases draft until package publication completes", () => {
  assert.match(release, /Ensure matching GitHub draft/);
  assert.match(release, /Publish GitHub Release draft/);
  assert.match(release, /-F draft=false/);
  assert.match(release, /GitHub Release: \*\*draft\*\*/);
  assert.match(release, /Package publication: \*\*not requested\*\*/);
  assert.match(release, /status == "staged"/);
  assert.match(
    release,
    /remains a draft until registry publication is complete/,
  );
});

test("release workflow consumes canonical release identity from workspace-release", () => {
  assert.match(release, /\.identity\.tagName/);
  assert.match(release, /\.identity\.releaseName/);
  assert.match(release, /RELEASE_TAG/);
  assert.match(release, /RELEASE_NAME/);
});

test("standalone publish finalizes the canonical GitHub draft after publication", () => {
  assert.match(publish, /releaseIdentity\.tagName/);
  assert.match(publish, /releaseIdentity\.releaseName/);
  assert.match(publish, /Verify matching GitHub draft/);
  assert.match(publish, /Publish GitHub Release draft/);
  assert.match(publish, /-F draft=false/);
  assert.match(publish, /status == "staged"/);
  assert.match(publish, /canonical Git tag does not exist/);
  assert.match(publish, /contents: write/);
  assert.match(publishWrapper, /contents: write/);
});

test("release resolves the target before ensuring a draft and performing mutation", () => {
  const preview = release.indexOf("- name: Resolve target release");
  const draft = release.indexOf("- name: Ensure matching GitHub draft");
  const perform = release.indexOf("- name: Perform release");
  const push = release.indexOf("- name: Push release commit and tag");

  assert.ok(preview >= 0);
  assert.ok(draft > preview);
  assert.ok(perform > draft);
  assert.ok(push > perform);
  assert.match(release, /"--dry-run"/);
  assert.match(release, /\.nextVersion/);
  assert.match(release, /\.identity\.tagName/);
  assert.match(release, /\.identity\.releaseName/);
});

test("release creates a missing target draft and reuses an existing one", () => {
  assert.match(release, /select\(\.draft == true and \.tag_name == \$tag\)/);
  assert.match(release, /--method POST/);
  assert.match(release, /--method PATCH/);
  assert.match(release, /ACTION="created"/);
  assert.match(release, /ACTION="reused"/);
  assert.match(release, /-f body="\$BODY"/);
  assert.match(release, /A published GitHub Release already exists/);
});

test("release preview and real release must resolve the same canonical identity", () => {
  assert.match(release, /--arg expectedTag "\$RELEASE_TAG"/);
  assert.match(release, /--arg expectedName "\$RELEASE_NAME"/);
  assert.match(release, /\.identity\.tagName == \$expectedTag/);
  assert.match(release, /\.identity\.releaseName == \$expectedName/);
});
