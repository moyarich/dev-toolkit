import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "../..");
const workflows = resolve(root, ".github/workflows");

const workflow = readFileSync(join(workflows, "release-drafter.yml"), "utf8");
const template = readFileSync(
  join(root, ".github/release-drafter-package-template.yml"),
  "utf8",
);
const discovery = readFileSync(
  join(workflows, "reusable_discover-packages.yml"),
  "utf8",
);

test("release drafter discovers publishable packages dynamically", () => {
  assert.ok(
    workflow.includes(
      "uses: ./.github/workflows/reusable_discover-packages.yml",
    ),
  );
  assert.match(workflow, /require-publish-config: true/);
  assert.ok(
    workflow.includes(
      "matrix: ${{ fromJSON(needs.discover-packages.outputs.matrix",
    ),
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

  assert.ok(
    template.includes('name-template: "{{PACKAGE_NAME}} v$RESOLVED_VERSION"'),
  );
  assert.ok(
    template.includes(
      'tag-template: "{{PACKAGE_DIRECTORY}}@$RESOLVED_VERSION"',
    ),
  );
  assert.ok(template.includes('tag-prefix: "{{PACKAGE_DIRECTORY}}@"'));
  assert.ok(template.includes('- "{{PACKAGE_DIRECTORY}}/**"'));
});

test("first package release uses package git history and 0.1.0", () => {
  assert.match(workflow, /gh api/);
  assert.match(workflow, /\.draft == false/);
  assert.match(workflow, /startswith\(\$prefix\)/);
  assert.match(workflow, /PREVIOUS_TAG/);
  assert.match(workflow, /SOURCE="full package Git history"/);
  assert.match(workflow, /VERSION="0\.1\.0"/);
  assert.match(workflow, /git log \\/);
  assert.match(workflow, /-- "\$PACKAGE_DIRECTORY"/);
  assert.match(workflow, /Create or update first package draft/);
  assert.match(workflow, /Create or update subsequent package draft/);
  assert.match(workflow, /tag_name=/);
  assert.match(workflow, /html_url=/);
  assert.doesNotMatch(workflow, /git rev-list --max-parents=0 HEAD/);
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
  assert.doesNotMatch(
    workflow,
    /\n\s+from:\n\s+description: Optional comparison baseline ref/,
  );
});

test("first release is blocked when package tags exist without a published release", () => {
  assert.match(workflow, /git tag --list "\$PACKAGE_DIRECTORY@\*"/);
  assert.match(workflow, /EXISTING_GIT_TAG/);
  assert.match(workflow, /Refusing to treat this package as a first release/);
  assert.match(workflow, /existing-git-tag=/);
});

test("blocked first release writes would-have-created details to the summary", () => {
  assert.match(workflow, /## Release blocked/);
  assert.match(workflow, /Would-have-created/);
  assert.match(workflow, /WOULD_VERSION/);
  assert.match(workflow, /WOULD_TAG/);
  assert.match(workflow, /WOULD_NAME/);
  assert.match(workflow, /release history requires reconciliation/);
});

test("blocked release summary includes generated release content", () => {
  assert.match(workflow, /WOULD_CHANGES/);
  assert.match(workflow, /WOULD_BODY/);
  assert.match(workflow, /## Would-have-created release content/);
  assert.match(workflow, /## What's Changed/);
});
