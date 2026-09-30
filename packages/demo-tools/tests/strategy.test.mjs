import assert from "node:assert/strict";
import test from "node:test";
import { assertDemoStrategy, isMainModule, runDemoStrategy } from "../src/index.ts";

test("assertDemoStrategy accepts a valid strategy", () => {
  const strategy = { name: "example", run() {} };
  assert.doesNotThrow(() => assertDemoStrategy(strategy));
});

test("assertDemoStrategy requires run", () => {
  assert.throws(() => assertDemoStrategy({ name: "example" }), /run/);
});

test("runDemoStrategy derives strategy context from its module URL", async () => {
  let received;
  const strategy = { name: "example", run(context) { received = context; } };
  await runDemoStrategy({ strategy, moduleUrl: import.meta.url });
  assert.equal(received.id, "example");
  assert.match(received.strategyDirectory, /tests$/);
  assert.match(received.artifactsDirectory, /tests[/\\]artifacts$/);
});

test("isMainModule compares the module URL with the process entrypoint", () => {
  const original = process.argv[1];
  try {
    process.argv[1] = new URL(import.meta.url).pathname;
    assert.equal(isMainModule(import.meta.url), true);
    assert.equal(isMainModule(new URL("./other.mjs", import.meta.url).href), false);
  } finally {
    process.argv[1] = original;
  }
});
