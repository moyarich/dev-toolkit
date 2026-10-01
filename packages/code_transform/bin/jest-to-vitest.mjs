#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const workflowPath = resolve(
  packageRoot,
  "transforms/jest-to-vitest/workflow.yaml",
);

const args = process.argv.slice(2);
const auditOnly = args.includes("--audit-only");
const targetArg = args.find((arg) => !arg.startsWith("--")) ?? ".";
const target = resolve(process.cwd(), targetArg);

if (!existsSync(resolve(target, "package.json"))) {
  console.error(`No package.json found in target: ${target}`);
  process.exit(1);
}

function run(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function walk(dir, results = []) {
  const ignored = new Set([
    ".git",
    "node_modules",
    "coverage",
    "dist",
    "out",
    ".vscode-test",
  ]);

  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;

    const path = resolve(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path, results);
      continue;
    }

    if ([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"].includes(extname(path))) {
      results.push(path);
    }
  }

  return results;
}

function audit() {
  const problems = [];
  const packageJson = JSON.parse(
    readFileSync(resolve(target, "package.json"), "utf8"),
  );

  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const dependency of ["jest", "ts-jest", "@types/jest"]) {
    if (deps[dependency]) {
      problems.push(`Jest dependency remains: ${dependency}`);
    }
  }

  for (const [name, script] of Object.entries(packageJson.scripts ?? {})) {
    if (/\bjest\b/.test(script)) {
      problems.push(`Jest command remains in script "${name}": ${script}`);
    }
    if (/--runInBand\b/.test(script)) {
      problems.push(`Jest-only --runInBand remains in script "${name}"`);
    }
  }

  const jestConfig = [
    "jest.config.js",
    "jest.config.cjs",
    "jest.config.mjs",
    "jest.config.ts",
  ].find((name) => existsSync(resolve(target, name)));

  const vitestConfig = [
    "vitest.config.js",
    "vitest.config.mjs",
    "vitest.config.ts",
  ].find((name) => existsSync(resolve(target, name)));

  if (jestConfig) {
    problems.push(`Jest config remains: ${jestConfig}`);
  }

  if (!vitestConfig) {
    problems.push("No vitest.config.* file found");
  } else {
    const source = readFileSync(resolve(target, vitestConfig), "utf8");
    if (!/coverage\s*:/.test(source)) {
      problems.push(`${vitestConfig} does not define coverage configuration`);
    }
    if (!/thresholds\s*:/.test(source)) {
      problems.push(
        `${vitestConfig} does not define coverage thresholds; verify Jest coverageThreshold parity`,
      );
    }
  }

  for (const file of walk(target)) {
    const source = readFileSync(file, "utf8");
    if (/\bjest\./.test(source)) {
      problems.push(
        `Jest namespace reference remains: ${file.slice(target.length + 1)}`,
      );
    }
  }

  if (problems.length) {
    console.error("\nJest → Vitest audit failed:\n");
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Jest → Vitest audit passed.");
}

if (!auditOnly) {
  run("npx", ["--yes", "codemod", "jest/vitest"], target);
  run(
    "npx",
    ["--yes", "codemod", "workflow", "run", "-w", workflowPath],
    target,
  );
}

audit();
