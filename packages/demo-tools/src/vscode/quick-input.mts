import { pause } from "../utils/index.mjs";

export async function fillVisibleQuickInput({ page, value }) {
  const input = page.locator(".quick-input-widget:visible input").first();
  await input.waitFor({ state: "visible" });
  await input.fill(value);
}

export async function chooseVisibleQuickPickItem({ page, text, pauseMilliseconds = 250 }) {
  const item = page.locator(".quick-input-widget:visible .monaco-list-row", { hasText: text }).first();
  await item.waitFor({ state: "visible" });
  await item.click();
  if (pauseMilliseconds) await pause(pauseMilliseconds);
}

export async function confirmQuickInput({ page }) {
  await page.keyboard.press("Enter");
}
