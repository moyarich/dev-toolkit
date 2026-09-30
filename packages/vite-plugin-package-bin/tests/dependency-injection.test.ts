import assert from "node:assert/strict";
import test from "node:test";

import type { InlineConfig, ResolvedConfig } from "vite";

import { packageBinBuild } from "../src/packageBinBuild.ts";

test("packageBinBuild supports injected filesystem and Vite build dependencies", async () => {
  const removed: string[] = [];
  const builds: InlineConfig[] = [];

  const plugin = packageBinBuild(
    { emptyOutDir: true },
    {
      async *glob() {
        yield "src/release.ts";
      },
      async readFile(path) {
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
      },
      async rm(path) {
        removed.push(String(path));
      },
      async build(config) {
        builds.push(config);
        return {} as Awaited<ReturnType<typeof import("vite").build>>;
      },
    },
  );

  plugin.configResolved?.({
    root: "/repo",
    logLevel: "silent",
  } as ResolvedConfig);

  assert.equal(typeof plugin.buildStart, "function");
  await plugin.buildStart.call({} as never, {} as never);

  assert.deepEqual(removed, ["/repo/bin"]);
  assert.equal(builds.length, 1);
  assert.equal(builds[0].build?.outDir, "/repo/bin");
  assert.equal(builds[0].logLevel, "silent");
});
