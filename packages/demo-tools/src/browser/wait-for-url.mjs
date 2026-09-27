export async function waitForUrl(url, { timeout = 30_000, interval = 250, fetch: fetchImpl = globalThis.fetch } = {}) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetchImpl(url);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Timed out waiting for ${url}`, { cause: lastError });
}
