import path from "node:path";
export async function launchBrowserExtension({ chromium, extensionPath, headless = false, userDataDirectory = "", launchOptions = {} }) {
  if (!chromium?.launchPersistentContext) throw new TypeError("launchBrowserExtension requires Playwright chromium.");
  if (!extensionPath) throw new TypeError("launchBrowserExtension requires extensionPath.");
  const absolute = path.resolve(extensionPath);
  const context = await chromium.launchPersistentContext(userDataDirectory, {
    headless,
    ...launchOptions,
    args: [`--disable-extensions-except=${absolute}`, `--load-extension=${absolute}`, ...(launchOptions.args ?? [])],
  });
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  return { context, extensionId, serviceWorker: worker, async openPopup(popupPath = "popup.html") { return context.newPage().then(async (page) => { await page.goto(`chrome-extension://${extensionId}/${popupPath.replace(/^\//, "")}`); return page; }); } };
}
