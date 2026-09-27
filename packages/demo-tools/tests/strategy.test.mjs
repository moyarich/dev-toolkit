import assert from "node:assert/strict";
import test from "node:test";
import { defineDemoStrategy } from "../src/index.mjs";

test("defineDemoStrategy preserves a valid strategy", () => {
  const strategy = defineDemoStrategy({ name: "example", run() {} });
  assert.equal(strategy.name, "example");
  assert.equal(typeof strategy.run, "function");
  assert.equal(Object.isFrozen(strategy), true);
});

test("defineDemoStrategy requires run", () => {
  assert.throws(() => defineDemoStrategy({ name: "example" }), /run/);
});
