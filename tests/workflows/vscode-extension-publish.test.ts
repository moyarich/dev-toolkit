import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "vitest";

const workflows = resolve(import.meta.dirname, "../../.github/workflows");
const publish = readFileSync(
  join(workflows, "reusable_vscode-extension-publish.yml"),
  "utf8",
);

test("VS Code extension publishing is reusable and dry-run first", () => {
  assert.match(publish, /workflow_call:/);
  assert.match(publish, /dry-run:[\s\S]*?default: true/);
  assert.match(publish, /environment:\s*\n\s*name: \$\{\{ inputs\.release-environment \}\}/);
  assert.match(
    publish,
    /always\(\) && \(inputs\.dry-run \|\| needs\.publish-approval\.result == 'success'\)/,
  );
});

test("VS Code extension publishing verifies release identity before mutation", () => {
  assert.match(publish, /Required release tag \$TAG does not exist/);
  assert.match(publish, /No matching GitHub draft release exists for \$TAG/);
  assert.match(publish, /Draft release name must match canonical tag \$TAG/);
  assert.match(publish, /git checkout --detach "\$TAG"/);
  assert.match(publish, /Tagged package version \$TAGGED_VERSION does not match expected version \$VERSION/);
});

test("VS Code extension publishing packages before Marketplace and GitHub Release publication", () => {
  const packageIndex = publish.indexOf("- name: Package VSIX");
  const marketplaceIndex = publish.indexOf("- name: Publish to VS Code Marketplace");
  const releaseIndex = publish.indexOf("- name: Publish GitHub Release");

  assert.ok(packageIndex >= 0);
  assert.ok(marketplaceIndex > packageIndex);
  assert.ok(releaseIndex > marketplaceIndex);
  assert.match(publish, /npx @vscode\/vsce publish --packagePath "\$VSIX_PATH"/);
  assert.match(publish, /retention-days: 14/);
});

test("VS Code extension publishing supports already-published recovery", () => {
  assert.match(publish, /marketplace-mode == 'already-published'/);
  assert.match(publish, /status=already-published/);
  assert.match(
    publish,
    /inputs\.marketplace-mode == 'already-published' \|\| steps\.marketplace\.outcome == 'success'/,
  );
});
