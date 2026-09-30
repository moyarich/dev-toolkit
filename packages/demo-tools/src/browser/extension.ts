import path from "node:path";
import type { BrowserContext, BrowserPage, Chromium } from "../types.ts";

export interface LaunchBrowserExtensionOptions {
  chromium: Chromium;
  extensionPath: string;
  headless?: boolean;
  userDataDirectory?: string;
  launchOptions?: Record<string, unknown> & { args?: string[] };
}

export async function launchBrowserExtension({
  chromium,
  extensionPath,
  headless = false,
  userDataDirectory = "",
  launchOptions = {},
}: LaunchBrowserExtensionOptions): Promise<{
  context: BrowserContext;
  extensionId: string;
  serviceWorker: { url(): string };
  openPopup(popupPath?: string): Promise<BrowserPage>;
}> {
  if (!chromium?.launchPersistentContext)
    throw new TypeError("launchBrowserExtension requires Playwright chromium.");
  if (!extensionPath) throw new TypeError("launchBrowserExtension requires extensionPath.");
  const absolute = path.resolve(extensionPath);
  const context = await chromium.launchPersistentContext(userDataDirectory, {
    headless,
    ...launchOptions,
    args: [
      `--disable-extensions-except=${absolute}`,
      `--load-extension=${absolute}`,
      ...(launchOptions.args ?? []),
    ],
  });
  let worker = context.serviceWorkers?.()[0];
  if (!worker) worker = await context.waitForEvent?.("serviceworker");
  if (!worker) throw new Error("Browser extension service worker did not start.");
  const extensionId = new URL(worker.url()).host;
  return {
    context,
    extensionId,
    serviceWorker: worker,
    async openPopup(popupPath = "popup.html") {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/${popupPath.replace(/^\//, "")}`);
      return page;
    },
  };
}
