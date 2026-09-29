import assert from "node:assert/strict";
import test from "node:test";
import { waitForUrl } from "../src/browser/wait-for-url.mts";

test("waitForUrl resolves when an endpoint becomes ready", async () => {
  let attempts = 0;
  const response = await waitForUrl("http://example.test", {
    interval: 0,
    fetch: async () => ({ ok: ++attempts === 2 }),
  });
  assert.equal(response.ok, true);
  assert.equal(attempts, 2);
});
