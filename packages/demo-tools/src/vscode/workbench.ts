import { pause } from "../utils/index.ts";
import { getQuickOpenShortcut } from "./commands.ts";
import { fillVisibleQuickInput } from "./quick-input.ts";
import type { BrowserFrame, BrowserPage } from "../types.ts";

export async function openWorkspaceFile({ page, fileName, openToSide = false }: { page: BrowserPage; fileName: string; openToSide?: boolean }): Promise<void> {
  await page.keyboard.press(getQuickOpenShortcut());
  await fillVisibleQuickInput({ page, value: fileName });
  await pause(700);
  await page.keyboard.press(openToSide ? "Control+Enter" : "Enter");
}
export async function findFrameByHeading(page: BrowserPage, headingName: string, { timeout = 30_000 }: { timeout?: number } = {}): Promise<BrowserFrame> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      const heading = frame.getByRole("heading", { name: headingName });
      if (await heading.count()) { await heading.waitFor({ timeout: 5_000 }); return frame; }
    }
    await pause(250);
  }
  throw new Error(`Timed out waiting for webview heading: ${headingName}`);
}
export async function scrollThroughWebview(frame: BrowserFrame, { pauseMilliseconds = 910, overlap = 0.2 }: { pauseMilliseconds?: number; overlap?: number } = {}): Promise<void> {
  await frame.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await pause(pauseMilliseconds);
  const dimensions = await frame.evaluate(() => ({ viewportHeight: window.innerHeight, maximumScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight) }));
  const step = Math.max(1, Math.floor(dimensions.viewportHeight * (1 - overlap)));
  for (let top = step; top < dimensions.maximumScroll; top += step) { await frame.evaluate((value: number) => window.scrollTo({ top: value, behavior: "auto" }), top); await pause(pauseMilliseconds); }
  if (dimensions.maximumScroll > 0) { await frame.evaluate((value: number) => window.scrollTo({ top: value, behavior: "auto" }), dimensions.maximumScroll); await pause(pauseMilliseconds); }
}
