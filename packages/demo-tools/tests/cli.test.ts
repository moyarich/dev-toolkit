import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = resolve(import.meta.dirname, "..");

function invoke(script: string, ...args: string[]) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

for (const command of ["dist/bin/demo.mjs", "dist/bin/demo-strategy.mjs"]) {
  describe(command, () => {
    test("shows help without running its action", () => {
      const result = invoke(command, "--help");
      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Usage:/);
      expect(result.stdout).toMatch(/--help/);
    });

    test("rejects unknown flags before running its action", () => {
      const result = invoke(command, "--not-a-real-option");
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/unknown option/);
    });
  });
}
