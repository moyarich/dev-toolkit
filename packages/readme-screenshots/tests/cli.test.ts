import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const root = resolve(import.meta.dirname, "..");

function invoke(...args: string[]) {
  try {
    return { status: 0, stdout: execFileSync(process.execPath, ["bin/readme-screenshots.mjs", ...args], { cwd: root, encoding: "utf8" }), stderr: "" };
  } catch (error: any) {
    return { status: error.status, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

test("CLI shows help without running its action", () => {
  const result = invoke("--help");
  expect(result.status).toBe(0);
  expect(result.stdout).toMatch(/Usage:/);
  expect(result.stdout).toMatch(/--help/);
});

test("CLI rejects unknown flags before running its action", () => {
  const result = invoke("--not-a-real-option");
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/unknown option/);
});
