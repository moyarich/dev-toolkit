import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

const workflows = resolve(import.meta.dirname, "../../.github/workflows");

const release = readFileSync(
  join(workflows, "package-workspace-tools-release.yml"),
  "utf8",
);
const publish = readFileSync(
  join(workflows, "package-workspace-tools-publish.yml"),
  "utf8",
);

for (const [name, workflow, approvalJob] of [
  ["release", release, "release-approval"],
  ["publish", publish, "publish-approval"],
]) {
  test(`${name} gates real mutations with the release environment`, () => {
    assert.match(workflow, new RegExp(`  ${approvalJob}:\\n`));
    assert.match(workflow, /if: \$\{\{ !inputs\.dry-run \}\}/);
    assert.match(workflow, /environment:\s*\n\s*name: release/);
    assert.match(
      workflow,
      /if: \$\{\{ always\(\) && \(inputs\.dry-run \|\| needs\.[a-z-]+\.result == 'success'\) \}\}/,
    );
  });
}
