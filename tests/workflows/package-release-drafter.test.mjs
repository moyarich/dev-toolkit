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

test("release drafter workflow uses package matrix configs", () => {
  for (const [directory, name] of packages) {
    assert.match(workflow, new RegExp(`directory: ${directory}`));
    assert.match(
      workflow,
      new RegExp(
        `config: release-drafter-${directory.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")}\\.yml`,
      ),
    );
    assert.match(workflow, new RegExp(name.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")));
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

    assert.match(config, new RegExp(`name-template: "${name.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")} v\\$RESOLVED_VERSION"`));
    assert.match(
      config,
      new RegExp(
        `tag-template: "packages/${directory.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")}@\\$RESOLVED_VERSION"`,
      ),
    );
    assert.match(
      config,
      new RegExp(
        `tag-prefix: "packages/${directory.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")}@"`,
      ),
    );
    assert.match(
      config,
      new RegExp(
        `- "packages/${directory.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")}/\\*\\*"`,
      ),
    );
  }
});
