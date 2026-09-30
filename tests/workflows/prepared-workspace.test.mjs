import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  statSync,
  existsSync,
  rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "../..");
const workflow = readFileSync(
  join(root, ".github/workflows/reusable_package-ci.yml"),
  "utf8",
);
const nodeCI = readFileSync(
  join(root, ".github/workflows/reusable_node-ci.yml"),
  "utf8",
);
const block = workflow
  .split("      - name: Archive prepared workspace\n")[1]
  .split("      - uses:")[0];
const archive = block
  .split("        run: |\n")[1]
  .split("\n")
  .map((line) => line.replace(/^          /, ""))
  .join("\n");

test("prepared workspace preserves CLI permissions, links, nested dependencies and build outputs", () => {
  const temp = mkdtempSync(join(tmpdir(), "prepared-workspace-"));
  try {
    const source = join(temp, "source");
    const target = join(temp, "restored");
    for (const dir of [
      "node_modules/.bin",
      "packages/tool/bin",
      "packages/tool/dist",
      "packages/tool/node_modules/nested",
      ".git",
    ]) {
      mkdirSync(join(source, dir), { recursive: true });
    }
    mkdirSync(target);
    writeFileSync(join(source, ".env"), "credentials excluded");
    writeFileSync(join(source, ".git/config"), "git excluded");
    writeFileSync(
      join(source, "packages/tool/bin/tool.mjs"),
      '#!/usr/bin/env node\nconsole.log("restored");\n',
      { mode: 0o755 },
    );
    writeFileSync(
      join(source, "packages/tool/dist/index.mjs"),
      "export default 42;\n",
    );
    writeFileSync(
      join(source, "packages/tool/node_modules/nested/index.js"),
      "module.exports = 42;\n",
    );
    symlinkSync("../packages/tool", join(source, "node_modules/tool"));
    symlinkSync(
      "../../packages/tool/bin/tool.mjs",
      join(source, "node_modules/.bin/tool"),
    );
    const output = join(temp, "output");
    execFileSync("bash", ["-e", "-c", archive], {
      cwd: source,
      env: {
        ...process.env,
        RUNNER_TEMP: temp,
        GITHUB_OUTPUT: output,
        GITHUB_RUN_ID: "123",
        GITHUB_RUN_ATTEMPT: "1",
      },
    });
    execFileSync("tar", ["-xf", join(temp, "prepared-workspace.tar")], {
      cwd: target,
    });
    assert.equal(
      execFileSync(join(target, "node_modules/.bin/tool"), {
        encoding: "utf8",
      }).trim(),
      "restored",
    );
    assert.equal(
      statSync(join(target, "packages/tool/bin/tool.mjs")).mode & 0o777,
      0o755,
    );
    assert.ok(existsSync(join(target, "node_modules/tool/dist/index.mjs")));
    assert.ok(
      existsSync(join(target, "packages/tool/node_modules/nested/index.js")),
    );
    assert.ok(!existsSync(join(target, ".env")));
    assert.ok(!existsSync(join(target, ".git")));
    assert.match(
      readFileSync(output, "utf8"),
      /artifact=prepared-workspace-123-1/,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("matrix consumes preparation and skips full installation and build", () => {
  assert.match(workflow, /needs: \[discover-packages, prepare-workspace\]/);
  assert.match(
    workflow,
    /prepared-artifact: \$\{\{ needs.prepare-workspace.outputs.artifact \}\}/,
  );
  for (const name of [
    "Install workspace dependencies",
    "Build all local packages",
  ]) {
    const step = nodeCI
      .split(`      - name: ${name}\n`)[1]
      .split("      - name:")[0];
    assert.match(step, /if: \$\{\{ inputs.prepared-artifact == '' \}\}/);
  }
});
