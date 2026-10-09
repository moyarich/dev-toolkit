import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const workflows = resolve(root, ".github/workflows");

const workflow = readFileSync(join(workflows, "release-drafter.yml"), "utf8");
const template = readFileSync(
  join(root, ".github/release-drafter-package-template.yml"),
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
      "matrix: ${{ fromJSON(needs.select-packages.outputs.matrix",
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
  assert.ok(workflow.includes('replaceAll("{{PACKAGE_NAME}}"'));
  assert.ok(workflow.includes('replaceAll("{{PACKAGE_DIRECTORY}}"'));

  assert.ok(template.includes('name-template: "{{RELEASE_NAME_TEMPLATE}}"'));
  assert.ok(template.includes('tag-template: "{{TAG_TEMPLATE}}"'));
  assert.ok(template.includes('tag-prefix: "{{TAG_PREFIX}}"'));
  assert.match(workflow, /releaseIdentity/);
  assert.match(workflow, /identity\.releaseName/);
  assert.match(workflow, /identity\.tagName/);
  assert.match(workflow, /identity\.tagPrefix/);
  assert.ok(template.includes('- "{{PACKAGE_DIRECTORY}}/**"'));
});

test("first package release uses curated changelog notes with commit fallback", () => {
  assert.match(workflow, /gh api/);
  assert.match(workflow, /\.draft == false/);
  assert.match(workflow, /startswith\(\$prefix\)/);
  assert.match(workflow, /PREVIOUS_TAG/);
  assert.match(workflow, /SOURCE="full package Git history"/);
  assert.match(workflow, /VERSION="0\.1\.0"/);
  assert.match(workflow, /CHANGELOG_PATH="\$PACKAGE_DIRECTORY\/CHANGELOG\.md"/);
  assert.match(workflow, /line\.trim\(\) === heading/);
  assert.match(workflow, /if \[ -z "\$NOTES" \]; then/);
  assert.match(workflow, /git log \\/);
  assert.match(workflow, /-- "\$PACKAGE_DIRECTORY"/);
  assert.match(workflow, /groups = new Map/);
  assert.match(workflow, /seen = new Set/);
  assert.match(workflow, /Create or update first package draft/);
  assert.match(workflow, /Create or update subsequent package draft/);
  assert.match(workflow, /tag_name=/);
  assert.match(workflow, /html_url=/);
  assert.match(workflow, /## Release notes/);
  assert.match(workflow, /npm install \$PACKAGE_NAME@\$VERSION/);
  assert.doesNotMatch(workflow, /git rev-list --max-parents=0 HEAD/);
});

test("draft release workflow does not require the release environment", () => {
  assert.doesNotMatch(workflow, /environment:\s*\n\s*name: release/);
  assert.doesNotMatch(workflow, /approve-release:/);
});

test("release drafter keeps push-range selection separate from cumulative release history", () => {
  // IMPORTANT:
  // `github.event.before -> github.sha` is used only to decide which package
  // draft jobs need to run for a push. It must NOT become Release Drafter's
  // `from:` comparison range.
  //
  // Release Drafter must keep rebuilding each package draft cumulatively from
  // the previous published package release through current `main`. Otherwise,
  // cancelling an older per-package draft job could drop commits that were
  // present in the cancelled push but not in the newer push range.
  //
  // Invariant:
  //   package selection = only the current push range
  //   release notes     = all unreleased package changes from the previous
  //                       published package release through current main
  //
  // Never set Release Drafter's `from:` input to `github.event.before`.
  // Doing so would limit release notes to one push and could omit commits.
  //
  // Draft jobs use package-scoped GitHub Actions concurrency:
  //   group: draft-package-${{ github.repository }}-${{ matrix.directory }}
  //   cancel-in-progress: true
  //
  // If two pushes change the same package, the newer job enters the same
  // concurrency group and GitHub cancels the older in-progress job. The newer
  // job must therefore rebuild release notes cumulatively from the previous
  // published package release through current main, not just from its own
  // `github.event.before -> github.sha` push range.
  assert.doesNotMatch(
    workflow,
    /uses: release-drafter\/release-drafter@v7\.7\.0[\s\S]*?\n\s+from:/,
  );
  assert.doesNotMatch(
    workflow,
    /\n\s+from:\n\s+description: Optional comparison baseline ref/,
  );
});

test("tagged drafts are valid release-in-progress state while orphan tags are blocked", () => {
  assert.match(workflow, /git tag --list "\$PACKAGE_DIRECTORY@\*"/);
  assert.match(workflow, /EXISTING_GIT_TAG/);
  assert.match(workflow, /EXISTING_DRAFT_ID/);
  assert.match(workflow, /select\(\.draft == true and \.tag_name == \$tag\)/);
  assert.match(workflow, /existing tagged draft release/);
  assert.match(workflow, /Found orphan package Git tag/);
  assert.match(workflow, /existing-draft-id=/);
});

test("blocked first release writes would-have-created details to the summary", () => {
  assert.match(workflow, /## Release blocked/);
  assert.match(workflow, /Would-have-created/);
  assert.match(workflow, /WOULD_VERSION/);
  assert.match(workflow, /WOULD_TAG/);
  assert.match(workflow, /WOULD_NAME/);
  assert.match(workflow, /releaseIdentity/);
  assert.match(workflow, /release history requires reconciliation/);
});

test("blocked release summary includes generated release content", () => {
  assert.match(workflow, /WOULD_CHANGES/);
  assert.match(workflow, /WOULD_BODY/);
  assert.match(workflow, /## Would-have-created release content/);
  assert.match(workflow, /## What's Changed/);
});

test("release draft template includes install guidance", () => {
  assert.match(template, /## Release notes/);
  assert.match(
    template,
    /npm install \{\{PACKAGE_NAME\}\}@\$RESOLVED_VERSION --registry=https:\/\/npm\.pkg\.github\.com/,
  );
});

test("tagged draft releases are preserved for the release workflow", () => {
  assert.match(workflow, /steps\.baseline\.outputs\.existing-draft-id == ''/);
  assert.match(
    workflow,
    /Existing tagged draft detected\. The draft was left unchanged/,
  );
});

test("push drafting selects only packages changed by the pushed commits", () => {
  assert.match(workflow, /Select packages for drafting/);
  assert.match(workflow, /git diff --name-only "\$BEFORE_SHA" "\$AFTER_SHA"/);
  assert.match(workflow, /file\.startsWith\(`\$\{pkg\.directory\}\/`\)/);
  assert.match(workflow, /needs\.select-packages\.outputs\.matrix/);
  assert.match(
    workflow,
    /Root and shared-tooling changes do not implicitly draft every package/,
  );
});

test("package draft writers are serialized per package", () => {
  assert.match(workflow, /concurrency:/);
  assert.match(
    workflow,
    /group: draft-package-\$\{\{ github\.repository \}\}-\$\{\{ matrix\.directory \}\}/,
  );
  assert.match(workflow, /cancel-in-progress: true/);
});

test("automation-owned release drafts are marked as candidates", () => {
  assert.match(
    workflow,
    /dev-toolkit-release-draft:candidate package=\$PACKAGE_NAME/,
  );
  assert.match(
    template,
    /dev-toolkit-release-draft:candidate package=\{\{PACKAGE_NAME\}\}/,
  );
});
