import assert from "node:assert/strict";
import test from "node:test";
import { defineDemoStrategy, isMainModule, runDemoStrategy } from "../src/index.mts";

test("defineDemoStrategy preserves a valid strategy", () => {
  const strategy = defineDemoStrategy({ name: "example", run() {} });
  assert.equal(strategy.name, "example");
  assert.equal(Object.isFrozen(strategy), true);
});

test("defineDemoStrategy requires run", () => {
  assert.throws(() => defineDemoStrategy({ name: "example" }), /run/);
});

test("runDemoStrategy derives strategy context from its module URL", async () => {
  let received;
  const strategy = defineDemoStrategy({ name: "example", run(context) { received = context; } });
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
