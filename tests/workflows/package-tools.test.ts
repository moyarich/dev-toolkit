import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "vitest";

const workflows = resolve(import.meta.dirname, "../../.github/workflows");
const npmStub = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALL_LOG, args.join(' ') + '\\n');
const prefix = args.indexOf('--prefix');
const root = prefix < 0 ? path.join(process.cwd(), 'packages', process.env.TOOL_PACKAGE) : path.join(args[prefix + 1], 'node_modules/@moyarich', process.env.TOOL_PACKAGE);
if (!process.env.SKIP_ARTIFACTS) {
  fs.mkdirSync(path.join(root, 'bin'), {recursive:true});
  for (const command of JSON.parse(process.env.TOOL_COMMANDS)) {
    fs.writeFileSync(path.join(root, 'bin', command + '.mjs'), 'console.log(' + JSON.stringify(command) + ');\\n', {mode:0o644});
  }
}
if (prefix >= 0) {
  const bin = path.join(args[prefix + 1], 'node_modules/.bin');
  fs.mkdirSync(bin, {recursive:true});
  fs.writeFileSync(path.join(bin, 'playwright'), '#!/bin/bash\\nexit 0\\n', {mode:0o755});
}
`;

for (const file of [
  "reusable_npm-prepare-release.yml",
  "reusable_npm-release.yml",
  "reusable_npm-publish.yml",
  "reusable_readme-screenshots.yml",
]) {
  const screenshot = file.includes("screenshots");
  const packageName = screenshot ? "readme-screenshots" : "workspace-tools";
  const variable = screenshot
    ? "SCREENSHOT_TOOLS_ROOT"
    : "WORKSPACE_TOOLS_ROOT";
  const text = readFileSync(join(workflows, file), "utf8");
  const step = text
    .split(
      / {6}- name: Resolve (?:workspace tools CLI|screenshot tooling)\n/,
    )[1]
    .split(/\n {6}- /)[0];
  const script = step
    .split("        run: |\n")[1]
    .split("\n")
    .map((line) => line.replace(/^ {10}/, ""))
    .join("\n");
  const invocations = [
    ...new Set(
      [
        ...text.matchAll(
          /node "\$(?:WORKSPACE_TOOLS_ROOT|SCREENSHOT_TOOLS_ROOT)\/bin\/([^"/]+)\.mjs"/g,
        ),
      ].map((match) => match[0]),
    ),
  ];
  const commands = invocations.map((command) => {
    const match = command.match(/\/bin\/([^/]+)\.mjs/);
    assert.ok(match, `Unable to resolve CLI command from: ${command}`);
    return match[1];
  });

  for (const scenario of ["local", "published", "missing local output"]) {
    test(`${file}: ${scenario}, without npm command links`, () => {
      assert.ok(
        commands.length,
        "workflow must invoke the built files with Node",
      );
      const local = scenario !== "published";
      const directory = realpathSync(
        mkdtempSync(join(tmpdir(), "package workflow ")),
      );
      try {
        mkdirSync(join(directory, "tools"));
        const log = join(directory, "calls");
        const envFile = join(directory, "env");
        writeFileSync(envFile, "");
        // Build/install stubs create real CLI files, deliberately no npm links.
        writeFileSync(join(directory, "tools/npm"), npmStub, { mode: 0o755 });
        writeFileSync(join(directory, "tools/npx"), "#!/bin/bash\nexit 0\n", {
          mode: 0o755,
        });
        if (local) {
          const pkg = join(directory, "packages", packageName);
          mkdirSync(pkg, { recursive: true });
          writeFileSync(join(pkg, "package.json"), "{}");
        }
        const env = {
          ...process.env,
          PATH: `${directory}/tools:${process.env.PATH}`,
          // Resolve against the actual runner directory, not a host path.
          GITHUB_WORKSPACE: "/unavailable/host/workspace",
          RUNNER_TEMP: directory,
          GITHUB_ENV: envFile,
          CALL_LOG: log,
          PLAYWRIGHT_VERSION: "test",
          TOOL_PACKAGE: packageName,
          TOOL_COMMANDS: JSON.stringify(commands),
          SKIP_ARTIFACTS: scenario === "missing local output" ? "1" : "",
        };
        const result = spawnSync("bash", ["-e", "-c", script], {
          cwd: directory,
          encoding: "utf8",
          env,
        });
        if (scenario === "missing local output") {
          assert.notEqual(result.status, 0);
          assert.equal(readFileSync(envFile, "utf8"), "");
          return;
        }
        assert.equal(result.status, 0, result.stderr);
        const calls = readFileSync(log, "utf8");
        const output = readFileSync(envFile, "utf8");
        const root = output.trim().slice(`${variable}=`.length);
        assert.ok(output.startsWith(`${variable}=`));
        if (local) {
          assert.match(calls, /^run build\n$/);
          assert.equal(root, join(directory, "packages", packageName));
        } else {
          assert.ok(calls.includes(`@moyarich/${packageName}@latest`));
          assert.ok(root.endsWith(`/node_modules/@moyarich/${packageName}`));
        }
        for (const [index, invocation] of invocations.entries()) {
          assert.equal(
            existsSync(join(directory, "node_modules/.bin", commands[index])),
            false,
          );
          const invoked = spawnSync(
            "bash",
            ["-e", "-c", `${invocation} --help`],
            {
              cwd: directory,
              encoding: "utf8",
              env: { ...env, [variable]: root },
            },
          );
          assert.equal(invoked.status, 0, invoked.stderr);
          assert.equal(invoked.stdout.trim(), commands[index]);
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });
  }
}

test("package-lock workflow repairs before validating with npm ci", () => {
  const text = readFileSync(
    join(workflows, "reusable_npm-package-lock.yml"),
    "utf8",
  );

  const recreate = text.indexOf(
    "npm install \\\n            --package-lock-only",
  );
  const validate = text.indexOf(
    "run: npm ci --ignore-scripts --no-audit --no-fund",
  );

  assert.ok(
    recreate >= 0,
    "lockfile workflow must recreate with npm install --package-lock-only",
  );
  assert.ok(
    validate > recreate,
    "npm ci must validate only after lockfile recreation",
  );
  assert.doesNotMatch(
    text.slice(0, recreate),
    /npm ci/,
    "repair workflow must not require a valid lockfile before recreation",
  );
});

test("package-lock workflow can commit the repaired lockfile", () => {
  const text = readFileSync(
    join(workflows, "reusable_npm-package-lock.yml"),
    "utf8",
  );

  assert.match(text, /persist-credentials: \$\{\{ inputs\.commit \}\}/);
  assert.match(
    text,
    /if: \$\{\{ inputs\.commit && steps\.recreate\.outputs\.changed == 'true' \}\}/,
  );
  assert.match(text, /git push origin "HEAD:\$\{\{ github\.ref_name \}\}"/);
});
