import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";

const JEST_DEPENDENCIES = ["jest", "@types/jest", "ts-jest", "@swc/jest"];
const DEFAULT_VITEST_VERSION = "^5.0.2";

export type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

export type MigrationResult = {
  changed: boolean;
  warnings: string[];
};

export function migrateTestScript(script: string): string {
  let output = script.replace(/\s*--runInBand\b/g, "");

  const usesWatch = /\bjest\b[^&|;]*(?:--watch\b|--watchAll\b)/.test(output);
  output = output.replace(/\bjest\b/g, usesWatch ? "vitest" : "vitest run");

  return output.replace(/\s{2,}/g, " ").trim();
}

export function migratePackageJson(targetDir: string): MigrationResult {
  const packagePath = resolve(targetDir, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as PackageJson;
  const warnings: string[] = [];
  let changed = false;

  for (const field of ["dependencies", "devDependencies"] as const) {
    const deps = packageJson[field];
    if (!deps) continue;

    for (const dependency of JEST_DEPENDENCIES) {
      if (dependency in deps) {
        delete deps[dependency];
        changed = true;
      }
    }
  }

  const hadJestScript = Object.values(packageJson.scripts ?? {}).some((script) =>
    /\bjest\b|--runInBand\b/.test(script),
  );

  if (packageJson.scripts) {
    for (const [name, script] of Object.entries(packageJson.scripts)) {
      const migrated = migrateTestScript(script);
      if (migrated !== script) {
        packageJson.scripts[name] = migrated;
        changed = true;
      }
    }
  }

  if (changed || hadJestScript) {
    packageJson.devDependencies ??= {};

    if (!packageJson.devDependencies.vitest && !packageJson.dependencies?.vitest) {
      packageJson.devDependencies.vitest = DEFAULT_VITEST_VERSION;
      changed = true;
    }

    if (
      !packageJson.devDependencies["@vitest/coverage-v8"] &&
      !packageJson.dependencies?.["@vitest/coverage-v8"]
    ) {
      packageJson.devDependencies["@vitest/coverage-v8"] = DEFAULT_VITEST_VERSION;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }

  return { changed, warnings };
}

export function migrateSetupFile(targetDir: string): MigrationResult {
  const warnings: string[] = [];
  const candidates = ["ts", "js", "mjs", "cjs"];

  for (const extension of candidates) {
    const source = resolve(targetDir, `jest.setup.${extension}`);
    if (!existsSync(source)) continue;

    const destination = resolve(targetDir, `vitest.setup.${extension}`);
    if (existsSync(destination)) {
      warnings.push(
        `Skipped ${basename(source)} because ${basename(destination)} already exists.`,
      );
      return { changed: false, warnings };
    }

    renameSync(source, destination);
    return { changed: true, warnings };
  }

  return { changed: false, warnings };
}

function extractGlobalCoverageThresholds(source: string): Record<string, number> | null {
  const coverageMatch = source.match(/coverageThreshold\s*:\s*\{([\s\S]*?)\n\s*\}/);
  if (!coverageMatch) return null;

  const globalMatch = coverageMatch[1]?.match(/global\s*:\s*\{([\s\S]*?)\}/);
  if (!globalMatch) return null;

  const thresholds: Record<string, number> = {};
  for (const name of ["branches", "functions", "lines", "statements"]) {
    const match = globalMatch[1]?.match(new RegExp(`\\b${name}\\s*:\\s*(\\d+(?:\\.\\d+)?)`));
    if (match) thresholds[name] = Number(match[1]);
  }

  return Object.keys(thresholds).length > 0 ? thresholds : null;
}

function findSetupFile(targetDir: string): string | null {
  for (const extension of ["ts", "js", "mjs", "cjs"]) {
    const filename = `vitest.setup.${extension}`;
    if (existsSync(resolve(targetDir, filename))) return filename;
  }
  return null;
}

export function migrateJestConfig(targetDir: string): MigrationResult {
  const warnings: string[] = [];
  const jestConfigs = [
    "jest.config.ts",
    "jest.config.js",
    "jest.config.mjs",
    "jest.config.cjs",
  ];
  const vitestConfigs = [
    "vitest.config.ts",
    "vitest.config.js",
    "vitest.config.mjs",
  ];

  if (vitestConfigs.some((name) => existsSync(resolve(targetDir, name)))) {
    return { changed: false, warnings };
  }

  const jestConfig = jestConfigs.find((name) =>
    existsSync(resolve(targetDir, name)),
  );
  if (!jestConfig) return { changed: false, warnings };

  const jestConfigPath = resolve(targetDir, jestConfig);
  const source = readFileSync(jestConfigPath, "utf8");
  const thresholds = extractGlobalCoverageThresholds(source);

  if (!thresholds) {
    warnings.push(
      `Could not safely map coverageThreshold from ${jestConfig}; leaving the Jest config in place for manual migration.`,
    );
    return { changed: false, warnings };
  }

  const setupFile = findSetupFile(targetDir);
  const thresholdLines = Object.entries(thresholds)
    .map(([name, value]) => `        ${name}: ${value},`)
    .join("\n");

  const setupLine = setupFile
    ? `    setupFiles: ["./${setupFile}"],\n`
    : "";

  const vitestConfig = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
${setupLine}    coverage: {
      provider: "v8",
      thresholds: {
${thresholdLines}
      },
    },
  },
});
`;

  writeFileSync(resolve(targetDir, "vitest.config.ts"), vitestConfig);
  rmSync(jestConfigPath);

  return { changed: true, warnings };
}

export function migrateProject(targetDir: string): MigrationResult {
  const results = [
    migratePackageJson(targetDir),
    migrateSetupFile(targetDir),
    migrateJestConfig(targetDir),
  ];

  return {
    changed: results.some((result) => result.changed),
    warnings: results.flatMap((result) => result.warnings),
  };
}
