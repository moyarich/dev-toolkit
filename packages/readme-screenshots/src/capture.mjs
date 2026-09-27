import { existsSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

export async function loadConfig(configPath) {
  const absolute = resolve(configPath);
  if (!existsSync(absolute)) return {};
  return (await import(pathToFileURL(absolute))).default || {};
}

export async function captureScreenshots(configPath = "readme-screenshots.config.mjs") {
  const config = await loadConfig(configPath);
  const baseUrl = process.env.PLAYGROUND_URL || config.url || "http://127.0.0.1:5173";
  const outputDir = resolve(process.env.DEMO_OUTPUT_DIR || config.outputDir || "docs/screenshots");
  const viewport = config.viewport || { width: 1440, height: 1000 };
  const screenshots = config.screenshots?.length
    ? config.screenshots
    : [{ name: process.env.README_SCREENSHOT_NAME || "playground-overview.png" }];

  mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport, deviceScaleFactor: config.deviceScaleFactor || 1 });

  try {
    await page.emulateMedia({ reducedMotion: config.reducedMotion || "reduce" });
    await page.goto(baseUrl, { waitUntil: config.waitUntil || "networkidle" });

    for (const shot of screenshots) {
      if (!shot.name) throw new Error("Each screenshot requires a name.");
      const target = shot.selector ? page.locator(shot.selector).first() : page;
      if (shot.selector) await target.waitFor({ state: "visible" });
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
