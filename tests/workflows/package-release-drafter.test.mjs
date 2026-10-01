import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "../..");
const workflows = resolve(root, ".github/workflows");

const workflow = readFileSync(
  join(workflows, "release-drafter.yml"),
  "utf8",
);
const template = readFileSync(
  join(root, ".github/release-drafter-package-template.yml"),
  "utf8",
);
const discovery = readFileSync(
  join(workflows, "reusable_discover-packages.yml"),
  "utf8",
);

test("release drafter discovers publishable packages dynamically", () => {
  assert.match(
    workflow,
    /uses: ./.github/workflows/reusable_discover-packages.yml/,
  );
  assert.match(workflow, /require-publish-config: true/);
  assert.match(
    workflow,
    /matrix: ${{ fromJSON(needs.discover-packages.outputs.matrix/,
  );
  assert.doesNotMatch(workflow, /directory: workspace-tools/);
  assert.doesNotMatch(workflow, /type: choice/);
});

test("release drafter generates one package config template at runtime", () => {
  assert.match(
    workflow,
    /config-name: file:release-drafter-package-generated.yml/,
  );
  assert.match(workflow, /replaceAll("{{PACKAGE_NAME}}"/);
  assert.match(workflow, /replaceAll("{{PACKAGE_DIRECTORY}}"/);

  assert.match(template, /name-template: "{{PACKAGE_NAME}} v$RESOLVED_VERSION"/);
  assert.match(
    template,
    /tag-template: "{{PACKAGE_DIRECTORY}}@$RESOLVED_VERSION"/,
  );
  assert.match(
    template,
    /tag-prefix: "{{PACKAGE_DIRECTORY}}@"/,
  );
  assert.match(
    template,
    /- "{{PACKAGE_DIRECTORY}}/**"/,
  );
});

test("first package release uses repository history and 0.1.0", () => {
  assert.match(workflow, /commitish: main/);
  assert.match(workflow, /gh api/);
  assert.match(workflow, /\.draft == false/);
  assert.match(workflow, /startswith\(\$prefix\)/);
  assert.match(workflow, /PREVIOUS_TAG/);
  assert.match(workflow, /git rev-list --max-parents=0 HEAD \| tail -n 1/);
  assert.match(workflow, /SOURCE="first commit on main"/);
  assert.match(workflow, /VERSION="0\.1\.0"/);
  assert.match(
    workflow,
    /version: \$\{\{ steps\.baseline\.outputs\.version \}\}/,
  );
  assert.match(workflow, /previous-tag=/);
});

test("shared discovery workflow exposes reusable package metadata", () => {
  assert.match(discovery, /workflow_call:/);
  assert.match(discovery, /packages:/);
  assert.match(discovery, /matrix:/);
  assert.match(discovery, /has-packages:/);
  assert.match(discovery, /count:/);
  assert.match(discovery, /require-publish-config:/);
  assert.match(discovery, /require-test-script:/);
  assert.match(discovery, /require-build-script:/);
});


test("draft release workflow does not require the release environment", () => {
  assert.doesNotMatch(workflow, /environment:\s*\n\s*name: release/);
  assert.doesNotMatch(workflow, /approve-release:/);
});


test("release drafter uses only supported action inputs", () => {
  assert.doesNotMatch(
    workflow,
    /uses: release-drafter\/release-drafter@v7\.7\.0[\s\S]*?\n\s+from:/,
  );
  assert.doesNotMatch(workflow, /\n\s+from:\n\s+description: Optional comparison baseline ref/);
});
