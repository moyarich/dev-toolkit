import type { Browser, BrowserContext, BrowserPage, Chromium } from "../types.ts";

export interface LaunchBrowserDemoOptions {
  chromium: Chromium;
  url?: string;
  viewport?: { width: number; height: number };
  launchOptions?: Record<string, unknown>;
  contextOptions?: Record<string, unknown>;
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
}

export interface BrowserDemo {
  browser: Browser;
  context: BrowserContext;
  page: BrowserPage;
  close(): Promise<void>;
}

export async function launchBrowserDemo({
  chromium,
  url,
  viewport = { width: 1280, height: 900 },
  launchOptions = {},
  contextOptions = {},
  waitUntil = "networkidle",
}: LaunchBrowserDemoOptions): Promise<BrowserDemo> {
  if (!chromium?.launch)
    throw new TypeError("launchBrowserDemo requires a Playwright chromium implementation.");
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport, ...contextOptions });
  const page = await context.newPage();
  if (url) await page.goto(url, { waitUntil });
  return {
    browser,
    context,
    page,
    async close() {
      await browser.close();
    },
  };
}
