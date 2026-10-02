import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  migratePackageJson,
  migrateProject,
  migrateTestScript,
} from "../src/project-migration.ts";

function makeProject(): string {
  return mkdtempSync(resolve(tmpdir(), "jest-to-vitest-project-"));
}

describe("project migration", () => {
  it("migrates Jest dependencies and scripts", () => {
    const dir = makeProject();
    writeFileSync(
      resolve(dir, "package.json"),
      JSON.stringify(
        {
          scripts: {
            test: "jest --coverage --runInBand",
            "test:watch": "jest --watchAll",
          },
          devDependencies: {
            jest: "^29.0.0",
            "@types/jest": "^29.0.0",
            "ts-jest": "^29.0.0",
            "@swc/jest": "^0.2.0",
          },
        },
        null,
        2,
      ),
    );

    const result = migratePackageJson(dir);
    const pkg = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8"));

    expect(result.changed).toBe(true);
    expect(pkg.devDependencies.jest).toBeUndefined();
    expect(pkg.devDependencies["@types/jest"]).toBeUndefined();
    expect(pkg.devDependencies["ts-jest"]).toBeUndefined();
    expect(pkg.devDependencies["@swc/jest"]).toBeUndefined();
    expect(pkg.devDependencies.vitest).toBe("^5.0.2");
    expect(pkg.devDependencies["@vitest/coverage-v8"]).toBe("^5.0.2");
    expect(pkg.scripts.test).toBe("vitest run --coverage");
    expect(pkg.scripts["test:watch"]).toBe("vitest --watch");
  });

  it("migrates setup and supported coverage config idempotently", () => {
    const dir = makeProject();
    writeFileSync(
      resolve(dir, "package.json"),
      JSON.stringify({ devDependencies: { jest: "^29.0.0" } }, null, 2),
    );
    writeFileSync(
      resolve(dir, "jest.setup.ts"),
      'import "@testing-library/jest-dom";\n',
    );
    writeFileSync(
      resolve(dir, "jest.config.ts"),
      `export default {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 81,
      lines: 82,
      statements: 83,
    },
  },
};
`,
    );

    const first = migrateProject(dir);
    const config = readFileSync(resolve(dir, "vitest.config.ts"), "utf8");

    expect(first.changed).toBe(true);
    expect(first.warnings).toEqual([]);
    expect(existsSync(resolve(dir, "jest.setup.ts"))).toBe(false);
    expect(existsSync(resolve(dir, "vitest.setup.ts"))).toBe(true);
    expect(existsSync(resolve(dir, "jest.config.ts"))).toBe(false);
    expect(config).toContain('setupFiles: ["./vitest.setup.ts"]');
    expect(config).toContain("branches: 80");
    expect(config).toContain("functions: 81");
    expect(config).toContain("lines: 82");
    expect(config).toContain("statements: 83");

    const second = migrateProject(dir);
    expect(second.changed).toBe(false);
    expect(second.warnings).toEqual([]);
  });

  it("keeps unsupported Jest config explicit", () => {
    const dir = makeProject();
    writeFileSync(resolve(dir, "package.json"), JSON.stringify({}));
    writeFileSync(
      resolve(dir, "jest.config.js"),
      "module.exports = { testEnvironment: 'node' };\n",
    );

    const result = migrateProject(dir);

    expect(result.warnings).toHaveLength(1);
    expect(existsSync(resolve(dir, "jest.config.js"))).toBe(true);
    expect(existsSync(resolve(dir, "vitest.config.ts"))).toBe(false);
  });

  it("migrates watch flags without forcing run mode", () => {
    expect(migrateTestScript("jest --watchAll")).toBe("vitest --watch");
    expect(migrateTestScript("jest --runInBand")).toBe("vitest run");
  });
});
