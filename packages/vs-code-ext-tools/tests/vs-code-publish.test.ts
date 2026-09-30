import { beforeEach, expect, test, vi } from "vitest";

const { confirm, spawnSync } = vi.hoisted(() => ({
  confirm: vi.fn(),
  spawnSync: vi.fn(),
}));

vi.mock("@inquirer/prompts", () => ({ confirm }));
vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  spawnSync,
}));

import { publishExtension } from "../src/publish_ext.ts";

beforeEach(() => {
  vi.clearAllMocks();
  confirm.mockResolvedValue(true);
  spawnSync.mockReturnValue({ status: 0 });
  process.env.VSCE_PAT = "test-token";
});

test("forwards publisher arguments to VS Code Marketplace", async () => {
  await publishExtension("vscode", ["--pre-release", "--skip-duplicate"]);

  expect(spawnSync).toHaveBeenLastCalledWith(
    "npx",
    ["@vscode/vsce", "publish", "--pre-release", "--skip-duplicate"],
    expect.objectContaining({
      env: process.env,
      stdio: "inherit",
    }),
  );
});

test("forwards publisher arguments to Open VSX", async () => {
  process.env.OVSX_PAT = "test-token";

  await publishExtension("openvsx", ["--skip-duplicate"]);

  expect(spawnSync).toHaveBeenLastCalledWith(
    "npx",
    ["ovsx", "publish", "--skip-duplicate"],
    expect.objectContaining({
      env: process.env,
      stdio: "inherit",
    }),
  );
});
