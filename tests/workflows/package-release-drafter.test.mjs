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

  assert.match(workflow, /disable-autolabeler: true/);
  assert.match(workflow, /commitish: main/);
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
