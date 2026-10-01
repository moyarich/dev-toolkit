import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { test } from "node:test";

const repo = resolve(import.meta.dirname, "../..");
const workflow = readFileSync(
  join(repo, ".github/workflows/reusable_package-ci.yml"),
  "utf8",
);
const step = workflow
  .split("      - name: Resolve workspace tools CLI\n")[1]
  .split("      - id: packages")[0];
const script = step
  .split("        run: |\n")[1]
  .split("\n")
  .map((line) => line.replace(/^ {10}/, ""))
  .join("\n");

for (const local of [true, false]) {
  void test(`discovery ${local ? "compiles local helper without installing dependencies" : "uses latest published fallback"}`, () => {
    const root = mkdtempSync(join(tmpdir(), "discovery-workflow-"));
    try {
      mkdirSync(join(root, "tools"));
      const envFile = join(root, "env");
      writeFileSync(envFile, "");
      const npm = local
        ? '#!/bin/bash\necho "Unexpected npm call" >&2\nexit 99\n'
        : `#!/bin/bash
set -eu
printf '%s\\n' "$*" > "$CALL_LOG"
while [ "$1" != --prefix ]; do shift; done
shift
mkdir -p "$1/node_modules/@moyarich/workspace-tools/bin"
printf 'console.log("[]")\\n' > "$1/node_modules/@moyarich/workspace-tools/bin/discover-test-packages.mjs"
`;
      writeFileSync(join(root, "tools/npm"), npm, { mode: 0o755 });
      if (local) {
        const src = join(root, "packages/workspace-tools/src");
        mkdirSync(src, { recursive: true });
        copyFileSync(
          join(repo, "packages/workspace-tools/src/discover-test-packages.ts"),
          join(src, "discover-test-packages.ts"),
        );
        for (const name of [
          "tracked",
          "untracked",
          "node_modules/dependency",
        ]) {
          mkdirSync(join(root, "packages", name), { recursive: true });
          writeFileSync(
            join(root, "packages", name, "package.json"),
            JSON.stringify({ name, scripts: { test: "test" } }),
          );
        }
        execFileSync("git", ["init", "-q"], { cwd: root });
        execFileSync("git", ["add", "packages/tracked/package.json"], {
          cwd: root,
        });
      }
      const result = spawnSync("bash", ["-e", "-c", script], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${root}/tools:${process.env.PATH}`,
          RUNNER_TEMP: root,
          GITHUB_ENV: envFile,
          CALL_LOG: join(root, "calls"),
        },
      });
      assert.equal(result.status, 0, result.stderr);
      const cli = readFileSync(envFile, "utf8")
        .trim()
        .slice("DISCOVERY_CLI=".length);
      const output = execFileSync(
        process.execPath,
        [cli, "packages", "--json"],
        { cwd: root, encoding: "utf8" },
      );
      assert.deepEqual(
        JSON.parse(output),
        local ? [{ directory: "packages/tracked", name: "tracked" }] : [],
      );
      assert.equal(existsSync(join(root, "node_modules")), false);
      if (!local)
        assert.match(
          readFileSync(join(root, "calls"), "utf8"),
          /@moyarich\/workspace-tools@latest/,
        );
      assert.ok(!workflow.split("  prepare-workspace:")[0].includes("npm ci"));
      assert.ok(
        !workflow.split("  prepare-workspace:")[0].includes("npm run build"),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
