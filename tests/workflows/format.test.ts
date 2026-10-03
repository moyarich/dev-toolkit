import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "vitest";

const workflow = readFileSync(
  resolve(import.meta.dirname, "../../.github/workflows/reusable_format.yml"),
  "utf8",
);

test("format workflow writes fixes before verifying formatting", () => {
  const write = workflow.indexOf(". --write");
  const check = workflow.indexOf(". --check");

  assert.ok(write >= 0, "format workflow must run Prettier in write mode");
  assert.ok(check > write, "Prettier --check must verify after --write");
  assert.doesNotMatch(
    workflow.slice(0, write),
    /npm ci/,
    "format repair must not depend on a clean npm install",
  );
});

test("format workflow uses the repository-pinned Prettier version", () => {
  assert.match(workflow, /devDependencies\?\.prettier/);
  assert.match(
    workflow,
    /npx --yes "prettier@\$\{\{ steps\.prettier\.outputs\.version \}\}" \. --write/,
  );
  assert.match(
    workflow,
    /npx --yes "prettier@\$\{\{ steps\.prettier\.outputs\.version \}\}" \. --check/,
  );
});

test("format workflow previews by default and only commits when requested", () => {
  assert.match(workflow, /default: false/);
  assert.match(
    workflow,
    /if: \$\{\{ inputs\.commit && steps\.format\.outputs\.changed == 'true' \}\}/,
  );
  assert.match(workflow, /git commit -m "style: format repository"/);
  assert.match(
    workflow,
    /ref: \$\{\{ github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.ref \|\| github\.ref_name \}\}/,
  );
  assert.match(
    workflow,
    /TARGET_REF="\$\{\{ github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.ref \|\| github\.ref_name \}\}"/,
  );
  assert.match(workflow, /git push origin "HEAD:\$TARGET_REF"/);
  assert.match(workflow, /persist-credentials: \$\{\{ inputs\.commit \}\}/);
});

test("format workflow reports changed files in the job summary", () => {
  assert.match(workflow, /git status --short > \/tmp\/format-status\.txt/);
  assert.match(workflow, /Formatting changes/);
  assert.match(
    workflow,
    /Preview only\. Formatting changes were written in the runner but not committed\./,
  );
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
});

test("format workflow commits repairs before surfacing verification failure", () => {
  const verify = workflow.indexOf("id: verify");
  const commit = workflow.indexOf("- name: Commit formatting changes");
  const fail = workflow.indexOf(
    "- name: Fail if formatting verification failed",
  );

  assert.ok(verify >= 0, "verification step must exist");
  assert.ok(
    commit > verify,
    "commit step must run after verification is captured",
  );
  assert.ok(
    fail > commit,
    "verification failure must be surfaced after commit",
  );
  assert.match(workflow, /continue-on-error: true/);
  assert.match(
    workflow,
    /if: \$\{\{ always\(\) && steps\.verify\.outcome == 'failure' \}\}/,
  );
});
