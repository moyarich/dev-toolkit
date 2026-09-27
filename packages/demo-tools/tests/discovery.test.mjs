import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { discoverDemoStrategies } from "../src/discover.mjs";
import { runDemoStrategies } from "../src/run.mjs";

async function strategy(root, relative, name) {
  const directory = path.join(root, relative);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.mjs"), `export default { name: ${JSON.stringify(name)}, async run(context) { return context.id; } };\n`);
}

test("discovery is recursive, sorted, and ignores artifacts", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "demo-strategies-"));
  await strategy(root, "nested/z", "zeta");
  await strategy(root, "a", "alpha");
  await strategy(root, "artifacts/ignored", "ignored");
  const found = await discoverDemoStrategies({ directory: root });
  assert.deepEqual(found.map(({ id }) => id), ["alpha", "zeta"]);
});

test("discovery rejects duplicate strategy names", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "demo-strategies-"));
  await strategy(root, "one", "same");
  await strategy(root, "two", "same");
  await assert.rejects(() => discoverDemoStrategies({ directory: root }), /Duplicate demo strategy name/);
});

test("runDemoStrategies runs selected strategies and rejects unknown names", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "demo-strategies-"));
  const artifacts = path.join(root, "output");
  await strategy(root, "one", "one");
  assert.deepEqual(await runDemoStrategies({ directory: root, selected: ["one"], artifactsDirectory: artifacts }), [{ id: "one", result: "one" }]);
  await assert.rejects(() => runDemoStrategies({ directory: root, selected: ["missing"], artifactsDirectory: artifacts }), /Unknown demo strategies/);
});
