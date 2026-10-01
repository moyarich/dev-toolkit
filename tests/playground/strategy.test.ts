import assert from "node:assert/strict";
import test from "node:test";
import strategy from "../../demo/strategies/hello/index.ts";

test("playground exposes a directly executable demo strategy", () => {
  assert.equal(strategy.name, "hello");
  assert.deepEqual(strategy.tags, ["playground"]);
  assert.equal(typeof strategy.run, "function");
});
