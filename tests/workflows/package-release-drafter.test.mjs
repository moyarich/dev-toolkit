import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "../..");
const workflows = resolve(root, ".github/workflows");

const packages = [
  ["demo-tools", "@moyarich/demo-tools"],
  ["readme-screenshots", "@moyarich/readme-screenshots"],
  ["vite-plugin-package-bin", "@moyarich/vite-plugin-package-bin"],
  ["vs-code-ext-tools", "@moyarich/vs-code-ext-tools"],
  ["web-components", "@moyarich/web-components"],
  ["workspace-tools", "@moyarich/workspace-tools"],
];

const workflow = readFileSync(
  join(workflows, "release-drafter.yml"),
  "utf8",
);

const escapeRegex = (value) =>
  value.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\const workflow = readFileSync(
  join(workflows, "release-drafter.yml"),
  "utf8",
);
");

test("release drafter workflow uses package matrix configs", () => {
  for (const [directory, name] of packages) {
    assert.match(workflow, new RegExp(`directory: ${directory}`));
    assert.match(
      workflow,
      new RegExp(
        `config: release-drafter-${escapeRegex(directory)}\\.yml`,
      ),
    );
    assert.match(workflow, new RegExp(escapeRegex(name)));
  }

  assert.match(workflow, /commitish: main/);
  assert.match(workflow, /version:\s+\$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.version \|\| '' \}\}/);
  assert.match(workflow, /from:\s+\$\{\{ github\.event_name == 'workflow_dispatch' && steps\.baseline\.outputs\.from \|\| '' \}\}/);
  assert.match(workflow, /git rev-list --max-parents=0 HEAD \| tail -n 1/);
  assert.match(workflow, /description: Optional explicit release version \(for first release, use 0\.1\.0\)/);
  assert.match(workflow, /description: Optional comparison baseline ref; empty \+ explicit version uses the first commit on main/);
  assert.doesNotMatch(workflow, /disable-autolabeler:/);
});

test("each package release config filters by package path and tag namespace", () => {
  for (const [directory, name] of packages) {
    const config = readFileSync(
      join(root, `.github/release-drafter-${directory}.yml`),
      "utf8",
    );

    assert.match(config, new RegExp(`name-template: "${escapeRegex(name)} v\\$RESOLVED_VERSION"`));
    assert.match(
      config,
      new RegExp(
        `tag-template: "packages/${escapeRegex(directory)}@\\$RESOLVED_VERSION"`,
      ),
    );
    assert.match(
      config,
      new RegExp(
        `tag-prefix: "packages/${escapeRegex(directory)}@"`,
      ),
    );
    assert.match(
      config,
      new RegExp(
        `- "packages/${escapeRegex(directory)}/\\*\\*"`,
      ),
    );
  }
});
