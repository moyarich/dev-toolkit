export interface WaitForUrlOptions {
  timeout?: number;
  interval?: number;
  fetch?: typeof globalThis.fetch;
}

export async function waitForUrl(
  url: string | URL,
  { timeout = 30_000, interval = 250, fetch: fetchImpl = globalThis.fetch }: WaitForUrlOptions = {},
): Promise<Response> {
  const deadline = Date.now() + timeout;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetchImpl(url);
      if (response.ok) return response;
    } catch (error: unknown) {
      lastError = error;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Timed out waiting for ${url}`, { cause: lastError });
}
