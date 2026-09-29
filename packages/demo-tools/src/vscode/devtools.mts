import type { BrowserPage, Chromium } from "../types.mts";

interface CDPBrowser {
  contexts(): Array<{ pages(): BrowserPage[] }>;
  close(): Promise<void>;
}
export async function waitForVSCodeDevTools({ remoteDebuggingPort, timeout = 30_000 }: { remoteDebuggingPort: number; timeout?: number }): Promise<string> {
  const endpoint = `http://127.0.0.1:${remoteDebuggingPort}`;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { const response = await fetch(`${endpoint}/json/version`); if (response.ok) return endpoint; } catch {}
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the VS Code demo window.");
}
export async function findVSCodeWorkbenchPage(browser: CDPBrowser, { timeout = 30_000 }: { timeout?: number } = {}): Promise<BrowserPage> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const pages = browser.contexts().flatMap((context) => context.pages());
    const page = pages.find((candidate) => (candidate as BrowserPage & { url?: () => string }).url?.().includes("workbench"));
    if (page) { await page.locator(".monaco-workbench").waitFor({ timeout }); return page; }
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("VS Code opened, but the workbench page was not found.");
}
export async function connectToVSCode({ chromium, remoteDebuggingPort, timeout = 30_000 }: { chromium: Chromium; remoteDebuggingPort: number; timeout?: number }): Promise<{ endpoint: string; browser: CDPBrowser; page: BrowserPage }> {
  if (!chromium?.connectOverCDP) throw new TypeError("connectToVSCode requires Playwright chromium.");
  const endpoint = await waitForVSCodeDevTools({ remoteDebuggingPort, timeout });
  const browser = await chromium.connectOverCDP(endpoint) as unknown as CDPBrowser;
  const page = await findVSCodeWorkbenchPage(browser, { timeout });
  return { endpoint, browser, page };
}
