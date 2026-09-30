import { beforeEach, expect, test, vi } from "vitest";

const { build, glob, readFile, rm } = vi.hoisted(() => ({
  build: vi.fn(),
  glob: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs/promises")>()),
  glob,
  readFile,
  rm,
}));

vi.mock("vite", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vite")>()),
  build,
}));

import type { ResolvedConfig } from "vite";

import { packageBinBuild } from "../src/packageBinBuild.ts";

beforeEach(() => {
  vi.clearAllMocks();

  glob.mockReturnValue(
    (async function* () {
      yield "src/release.ts";
    })(),
  );

  readFile.mockImplementation(async (path: unknown) => {
    const value = String(path);
    if (value.endsWith("package.json")) {
      return JSON.stringify({
        bin: {
          release: "./bin/release.mjs",
        },
      });
    }
    if (value.endsWith("src/release.ts")) {
      return "#!/usr/bin/env node\nconsole.log('release');\n";
    }
    throw new Error(`Unexpected read: ${value}`);
  });

  build.mockResolvedValue({});
  rm.mockResolvedValue(undefined);
});

test("builds package bins using mocked filesystem and Vite modules", async () => {
  const plugin = packageBinBuild({ emptyOutDir: true });

  const configResolved =
    typeof plugin.configResolved === "function"
      ? plugin.configResolved
      : plugin.configResolved?.handler;
  expect(configResolved).toBeTypeOf("function");
  await configResolved?.call({} as never, {
    root: "/repo",
    logLevel: "silent",
  } as ResolvedConfig);

  const buildStart =
    typeof plugin.buildStart === "function"
      ? plugin.buildStart
      : plugin.buildStart?.handler;
  expect(buildStart).toBeTypeOf("function");
  await buildStart?.call({} as never, {} as never);

  expect(glob).toHaveBeenCalledWith("src/**/*.ts", { cwd: "/repo" });
  expect(rm).toHaveBeenCalledWith("/repo/bin", {
    recursive: true,
    force: true,
  });
  expect(build).toHaveBeenCalledTimes(1);
  expect(build).toHaveBeenCalledWith(
    expect.objectContaining({
      logLevel: "silent",
      build: expect.objectContaining({
        outDir: "/repo/bin",
      }),
    }),
  );
});
