import assert from "node:assert/strict";
import { test } from "vitest";
import { waitForUrl } from "../src/browser/wait-for-url.ts";

test("waitForUrl resolves when an endpoint becomes ready", async () => {
  let attempts = 0;

  const fetchMock: typeof fetch = () => {
    attempts += 1;

    return Promise.resolve(
      new Response(null, {
        status: attempts === 2 ? 200 : 503,
      }),
    );
  };

  const response = await waitForUrl("http://example.test", {
    interval: 0,
    fetch: fetchMock,
  });

  assert.equal(response.ok, true);
  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
});
