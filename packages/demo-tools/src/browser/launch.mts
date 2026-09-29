export async function launchBrowserDemo({
  chromium,
  url,
  viewport = { width: 1280, height: 900 },
  launchOptions = {},
  contextOptions = {},
  pageOptions = {},
  waitUntil = "networkidle",
} = {}) {
  if (!chromium?.launch) {
    throw new TypeError("launchBrowserDemo requires a Playwright chromium implementation.");
  }
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport, ...contextOptions });
  const page = await context.newPage(pageOptions);
  if (url) await page.goto(url, { waitUntil });
  return {
    browser,
    context,
    page,
    async close() { await browser.close(); },
  };
}
