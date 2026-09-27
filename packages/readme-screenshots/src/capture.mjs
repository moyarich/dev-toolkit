import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

export async function captureScreenshots(configPath) {
  const absoluteConfig = resolve(configPath);
  const { default: config } = await import(pathToFileURL(absoluteConfig));
  const baseUrl = process.env.PLAYGROUND_URL || config.url || "http://127.0.0.1:5173";
  const outputDir = resolve(process.env.DEMO_OUTPUT_DIR || config.outputDir || "docs/screenshots");
  const viewport = config.viewport || { width: 1440, height: 1000 };

  if (!Array.isArray(config.screenshots) || !config.screenshots.length) {
    throw new Error("Screenshot config must define a non-empty screenshots array.");
  }

  mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport, deviceScaleFactor: config.deviceScaleFactor || 1 });

  try {
    await page.emulateMedia({ reducedMotion: config.reducedMotion || "reduce" });
    await page.goto(baseUrl, { waitUntil: config.waitUntil || "networkidle" });

    for (const shot of config.screenshots) {
      if (!shot.name) throw new Error("Each screenshot requires a name.");
      const target = shot.selector ? page.locator(shot.selector).first() : page;
      if (shot.scrollIntoView && shot.selector) await target.scrollIntoViewIfNeeded();
      if (shot.waitForMs) await page.waitForTimeout(shot.waitForMs);
      await target.screenshot({
        path: resolve(outputDir, shot.name),
        ...(shot.selector ? {} : { fullPage: shot.fullPage ?? false }),
      });
    }
  } finally {
    await browser.close();
  }
}
