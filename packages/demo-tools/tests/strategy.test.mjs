import assert from "node:assert/strict";
import test from "node:test";
import { defineDemoStrategy, isMainModule, runDemoStrategy } from "../src/index.mjs";

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

test("isMainModule is false when another module is imported", () => {
  assert.equal(isMainModule(import.meta.url), false);
});
