import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "vitest";

const repo = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(repo, "package.json"), "utf8"));
const config = readFileSync(resolve(repo, ".dependency-cruiser.cjs"), "utf8");

test("root checks include the pinned dependency architecture scan", () => {
  assert.equal(
    pkg.scripts["deps:architecture"],
    "dependency-cruiser --config .dependency-cruiser.cjs --output-type err packages apps",
  );
  assert.equal(pkg.devDependencies["dependency-cruiser"], "18.4.0");
  assert.match(pkg.scripts.checks, /npm run deps:architecture$/);
});

test("dependency architecture rules block high-signal failures", () => {
  assert.match(config, /name: "no-circular"/);
  assert.match(config, /name: "no-unresolved"/);
  assert.match(
    config,
    /packages\/demo-tools\/src\/vscode\/extension-host\[\.\]cjs/,
  );
  assert.match(config, /name: "no-undeclared-package-dependencies"/);

  for (const rule of [
    "no-circular",
    "no-unresolved",
    "no-undeclared-package-dependencies",
  ]) {
    assert.match(
      config,
      new RegExp(`name: "${rule}"[\\s\\S]*?severity: "error"`),
    );
  }
});

test("noisier architecture smells begin as warnings", () => {
  for (const rule of [
    "no-production-to-tests",
    "no-cross-package-internals",
    "no-orphans",
  ]) {
    assert.match(
      config,
      new RegExp(`name: "${rule}"[\\s\\S]*?severity: "warn"`),
    );
  }
});
