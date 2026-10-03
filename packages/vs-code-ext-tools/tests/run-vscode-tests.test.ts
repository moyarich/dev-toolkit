import { expect, test } from "vitest";

import { getVSCodeCachePath } from "../src/run-vscode-tests.ts";

test("uses the macOS user cache directory", () => {
  expect(
    getVSCodeCachePath({
      platform: "darwin",
      home: "/Users/moya",
      env: {},
    }),
  ).toBe("/Users/moya/Library/Caches/vscode.test-electron-cache");
});

test("uses XDG_CACHE_HOME on Linux when available", () => {
  expect(
    getVSCodeCachePath({
      platform: "linux",
      home: "/home/moya",
      env: { XDG_CACHE_HOME: "/var/cache/moya" },
    }),
  ).toBe("/var/cache/moya/vscode.test-electron-cache");
});

test("falls back to ~/.cache on Linux", () => {
  expect(
    getVSCodeCachePath({
      platform: "linux",
      home: "/home/moya",
      env: {},
    }),
  ).toBe("/home/moya/.cache/vscode.test-electron-cache");
});

test("uses LOCALAPPDATA with Windows path semantics", () => {
  expect(
    getVSCodeCachePath({
      platform: "win32",
      home: "C:\\Users\\moya",
      env: { LOCALAPPDATA: "C:\\Users\\moya\\AppData\\Local" },
    }),
  ).toBe("C:\\Users\\moya\\AppData\\Local\\vscode.test-electron-cache");
});

test("allows an explicit cache override", () => {
  expect(
    getVSCodeCachePath({
      platform: "linux",
      home: "/home/moya",
      env: { VSCODE_TEST_CACHE: "/shared/vscode-cache" },
    }),
  ).toBe("/shared/vscode-cache");
});
