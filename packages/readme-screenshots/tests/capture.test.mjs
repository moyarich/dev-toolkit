import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { loadConfig } from "../src/capture.mts";

test("loadConfig returns an empty object for a missing config", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "readme-screenshots-"));
  assert.deepEqual(await loadConfig(path.join(directory, "missing.mjs")), {});
});

test("loadConfig loads a default ESM configuration", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "readme-screenshots-"));
  const file = path.join(directory, "config.mjs");
  await writeFile(file, 'export default { url: "http://example.test", screenshots: [{ name: "page.png" }] };\n');
  assert.deepEqual(await loadConfig(file), {
    url: "http://example.test",
    screenshots: [{ name: "page.png" }],
  });
});
