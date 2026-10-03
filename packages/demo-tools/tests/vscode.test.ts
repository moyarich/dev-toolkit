import assert from "node:assert/strict";
import { test } from "vitest";
import { getCommandPaletteShortcut, getQuickOpenShortcut } from "../src/vscode/commands.ts";
import { getVSCodeCachePath } from "../src/vscode/runtime.ts";

test("VS Code shortcuts are platform aware", () => {
  assert.equal(getCommandPaletteShortcut("darwin"), "Meta+Shift+P");
  assert.equal(getCommandPaletteShortcut("linux"), "Control+Shift+P");
  assert.equal(getQuickOpenShortcut("darwin"), "Meta+P");
  assert.equal(getQuickOpenShortcut("win32"), "Control+P");
});


test("VS Code cache path is shared across projects", () => {
  assert.equal(
    getVSCodeCachePath({
      platform: "darwin",
      homeDirectory: "/Users/moya",
      environment: {},
    }),
    "/Users/moya/Library/Caches/moya-vscode-test",
  );

  assert.equal(
    getVSCodeCachePath({
      platform: "linux",
      homeDirectory: "/home/moya",
      environment: {},
    }),
    "/home/moya/.cache/moya-vscode-test",
  );

  assert.equal(
    getVSCodeCachePath({
      platform: "win32",
      homeDirectory: "C:\\Users\\moya",
      environment: { LOCALAPPDATA: "C:\\Users\\moya\\AppData\\Local" },
    }),
    "C:\\Users\\moya\\AppData\\Local\\moya-vscode-test",
  );
});

test("VS Code cache path can be overridden", () => {
  assert.equal(
    getVSCodeCachePath({
      platform: "linux",
      homeDirectory: "/home/moya",
      environment: { DEMO_TOOLS_VSCODE_CACHE: "/shared/vscode-cache" },
    }),
    "/shared/vscode-cache",
  );
});
