import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { discoverCliEntries, standaloneCliBuilds } from "../src/packageBinBuild.ts";

test("standaloneCliBuilds creates one independent build per CLI entry", () => {
  const builds = standaloneCliBuilds(
    {
      alpha: "/repo/src/cli/alpha.ts",
      beta: "/repo/src/cli/beta.ts",
    },
    { emptyOutDir: true },
    "/repo",
  );

  assert.deepEqual(builds.map(({ name }) => name), ["alpha", "beta"]);

  for (const { name, config } of builds) {
    assert.equal(config.configFile, false);
    assert.equal(config.build?.emptyOutDir, false);
    assert.equal(config.build?.outDir, "/repo/bin");

    const output = config.build?.rollupOptions?.output;
    assert.ok(output && !Array.isArray(output));
    assert.equal(output.inlineDynamicImports, true);
    assert.equal(output.entryFileNames, `${name}.mjs`);
    assert.equal("chunkFileNames" in output, false);
  }
});

test("standaloneCliBuilds preserves CLI build options", () => {
  const [build] = standaloneCliBuilds(
    { demo: "/repo/demo.ts" },
    {
      emptyOutDir: false,
      outDir: "dist/bin",
      target: "node24",
      sourcemap: true,
      minify: true,
      external: ["commander"],
    },
    "/repo",
  );

  assert.equal(build.config.build?.outDir, "/repo/dist/bin");
  assert.equal(build.config.build?.target, "node24");
  assert.equal(build.config.build?.sourcemap, true);
  assert.equal(build.config.build?.minify, true);

  const external = build.config.build?.rollupOptions?.external;
  assert.ok(Array.isArray(external));
  assert.equal(external.at(-1), "commander");
});

test("discoverCliEntries finds managed bins across multiple source locations", async () => {
  const root = await mkdtemp(join(tmpdir(), "package-bin-build-"));

  try {
    await mkdir(join(root, "src/release"), { recursive: true });
    await mkdir(join(root, "scripts/diagnostics"), { recursive: true });
    await writeFile(join(root, "src/release/release.ts"), "export {};");
    await writeFile(join(root, "scripts/diagnostics/doctor.ts"), "export {};");

    const entries = await discoverCliEntries(
      ["src/**/*.ts", "scripts/**/*.ts"],
      root,
      {
        release: "./bin/release.mjs",
        doctor: "./bin/doctor.mjs",
      },
    );

    assert.deepEqual(Object.keys(entries), ["doctor", "release"]);
    assert.equal(entries.release, join(root, "src/release/release.ts"));
    assert.equal(entries.doctor, join(root, "scripts/diagnostics/doctor.ts"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("discoverCliEntries ignores source files that are not managed package bins", async () => {
  const root = await mkdtemp(join(tmpdir(), "package-bin-build-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src/release.ts"), "export {};");
    await writeFile(join(root, "src/helper.ts"), "export {};");

    const entries = await discoverCliEntries("src/**/*.ts", root, {
      release: "./bin/release.mjs",
    });

    assert.deepEqual(Object.keys(entries), ["release"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
