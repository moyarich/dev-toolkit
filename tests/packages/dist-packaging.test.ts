import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");

const distPackages = [
  "code-mod-jest-to-vitest",
  "demo-tools",
  "readme-screenshots",
  "vite-plugin-package-bin",
  "vs-code-ext-tools",
  "web-components",
];

for (const directory of distPackages) {
  test(`${directory} packages built dist output`, () => {
    const manifest = JSON.parse(
      readFileSync(
        resolve(repositoryRoot, "packages", directory, "package.json"),
        "utf8",
      ),
    ) as {
      files?: string[];
      bin?: string | Record<string, string>;
      exports?: Record<string, string | Record<string, string>>;
    };

    assert.ok(
      manifest.files?.includes("dist"),
      `${directory} must include dist in package.json#files`,
    );

    if (manifest.bin && typeof manifest.bin === "object") {
      for (const [name, path] of Object.entries(manifest.bin)) {
        assert.match(
          path,
          /^\.\/dist\/bin\//,
          `${directory} bin ${name} must resolve from dist/bin`,
        );
      }
    }
  });
}

test("demo-tools public exports resolve from dist", () => {
  const manifest = JSON.parse(
    readFileSync(
      resolve(repositoryRoot, "packages/demo-tools/package.json"),
      "utf8",
    ),
  ) as {
    exports: Record<string, string>;
  };

  for (const [name, path] of Object.entries(manifest.exports)) {
    assert.match(
      path,
      /^\.\/dist\//,
      `demo-tools export ${name} must resolve from dist`,
    );
  }
});
