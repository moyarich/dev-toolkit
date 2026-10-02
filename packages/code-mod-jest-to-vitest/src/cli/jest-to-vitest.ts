import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { migrateProject } from "../project-migration.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "../..");
const workflowPath = resolve(packageRoot, "workflow.yaml");

const args = process.argv.slice(2);
const auditOnly = args.includes("--audit-only");
const dryRun = args.includes("--dry-run");
const targetArg = args.find((arg) => !arg.startsWith("--")) ?? ".";
const target = resolve(process.cwd(), targetArg);

if (!existsSync(resolve(target, "package.json"))) {
  console.error(`No package.json found in target: ${target}`);
  process.exit(1);
}

type RunOptions = { allowFailure?: boolean };

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

function run(
  command: string,
  commandArgs: string[],
  cwd: string,
  { allowFailure = false }: RunOptions = {},
): number {
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (!allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result.status ?? 1;
}

function walk(dir: string, results: string[] = []): string[] {
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

    if (
      [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"].includes(extname(path))
    ) {
      results.push(path);
    }
  }

  return results;
}

function audit(targetDir: string): boolean {
  const problems: string[] = [];
  const packageJson = JSON.parse(
    readFileSync(resolve(targetDir, "package.json"), "utf8"),
  ) as PackageJson;

  const deps: Record<string, string> = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const dependency of ["jest", "ts-jest", "@types/jest", "@swc/jest"]) {
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
  ].find((name) => existsSync(resolve(targetDir, name)));

  const vitestConfig = [
    "vitest.config.js",
    "vitest.config.mjs",
    "vitest.config.ts",
  ].find((name) => existsSync(resolve(targetDir, name)));

  if (jestConfig) {
    problems.push(`Jest config remains: ${jestConfig}`);
  }

  if (!vitestConfig) {
    problems.push("No vitest.config.* file found");
  } else {
    const source = readFileSync(resolve(targetDir, vitestConfig), "utf8");
    if (!/coverage\s*:/.test(source)) {
      problems.push(`${vitestConfig} does not define coverage configuration`);
    }
    if (!/thresholds\s*:/.test(source)) {
      problems.push(
        `${vitestConfig} does not define coverage thresholds; verify Jest coverageThreshold parity`,
      );
    }
  }

  for (const file of walk(targetDir)) {
    const source = readFileSync(file, "utf8");
    if (/\bjest\./.test(source)) {
      problems.push(
        `Jest namespace reference remains: ${file.slice(targetDir.length + 1)}`,
      );
    }
  }

  if (problems.length) {
    console.error("\nJest → Vitest audit failed:\n");
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    return false;
  }

  console.log("Jest → Vitest audit passed.");
  return true;
}

function copyForDryRun(source: string, destination: string): void {
  const ignored = new Set([
    ".git",
    "node_modules",
    "coverage",
    "dist",
    "out",
    ".vscode-test",
  ]);

  cpSync(source, destination, {
    recursive: true,
    filter: (sourcePath) => !ignored.has(basename(sourcePath)),
  });
}

function migrate(targetDir: string): void {
  const projectMigration = migrateProject(targetDir);

  for (const warning of projectMigration.warnings) {
    console.warn(`Migration warning: ${warning}`);
  }

  run(
    "npx",
    ["--yes", "codemod", "workflow", "run", "-w", workflowPath],
    targetDir,
  );
}

if (auditOnly) {
  process.exitCode = audit(target) ? 0 : 1;
} else if (dryRun) {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "jest-to-vitest-"));
  const previewTarget = resolve(tempRoot, "project");

  try {
    console.log(`Dry run: copying ${target} to ${previewTarget}`);
    copyForDryRun(target, previewTarget);

    migrate(previewTarget);

    console.log(
      "\nDry-run diff (no files in the source project were changed):\n",
    );
    run(
      "git",
      ["diff", "--no-index", "--", target, previewTarget],
      process.cwd(),
      { allowFailure: true },
    );

    process.exitCode = audit(previewTarget) ? 0 : 1;
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
} else {
  migrate(target);
  process.exitCode = audit(target) ? 0 : 1;
}
