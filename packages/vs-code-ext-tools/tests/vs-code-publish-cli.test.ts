import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

test("built publish CLI shows help without publishing", () => {
  const result = spawnSync(
    process.execPath,
    ["dist/bin/vs-code-publish.mjs", "--help"],
    {
      cwd: resolve(import.meta.dirname, ".."),
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  expect(result.stdout).toMatch(/Usage:/);
  expect(result.stdout).toMatch(/--help/);
});
