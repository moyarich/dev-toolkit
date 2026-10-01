import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "vitest";

const workflow = readFileSync(
  resolve(import.meta.dirname, "../../.github/workflows/reusable_format.yml"),
  "utf8",
);

test("format workflow previews by default and only commits when requested", () => {
  assert.match(workflow, /default: false/);
  assert.match(workflow, /npm run format/);
  assert.match(
    workflow,
    /if: \${\{ inputs\.commit && steps\.format\.outputs\.changed == 'true' \}\}/,
  );
  assert.match(workflow, /git commit -m "style: format repository"/);
  assert.match(workflow, /git push origin "HEAD:\${\{ github\.ref_name \}\}"/);
  assert.match(workflow, /persist-credentials: \${\{ inputs\.commit \}\}/);
});

test("format workflow reports changed files in the job summary", () => {
  assert.match(workflow, /git status --short > \/tmp\/format-status\.txt/);
  assert.match(workflow, /Formatting changes/);
  assert.match(workflow, /Preview only\. Formatting changes were not committed\./);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
});
