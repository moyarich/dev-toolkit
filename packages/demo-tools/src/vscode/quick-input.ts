import { pause } from "../utils/index.ts";
import type { BrowserPage } from "../types.ts";

export async function fillVisibleQuickInput({ page, value }: { page: BrowserPage; value: string }): Promise<void> {
  const input = page.locator(".quick-input-widget:visible input").first();
  await input.waitFor({ state: "visible" });
  await input.fill(value);
}
export async function chooseVisibleQuickPickItem({ page, text, pauseMilliseconds = 250 }: { page: BrowserPage; text: string; pauseMilliseconds?: number }): Promise<void> {
  const item = page.locator(".quick-input-widget:visible .monaco-list-row", { hasText: text }).first();
  await item.waitFor({ state: "visible" });
  await item.click();
  if (pauseMilliseconds) await pause(pauseMilliseconds);
}
export async function confirmQuickInput({ page }: { page: BrowserPage }): Promise<void> { await page.keyboard.press("Enter"); }
