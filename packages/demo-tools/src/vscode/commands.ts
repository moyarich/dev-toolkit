import type { BrowserPage } from "../types.ts";

export function getCommandPaletteShortcut(platform: NodeJS.Platform = process.platform): string {
  return platform === "darwin" ? "Meta+Shift+P" : "Control+Shift+P";
}
export function getQuickOpenShortcut(platform: NodeJS.Platform = process.platform): string {
  return platform === "darwin" ? "Meta+P" : "Control+P";
}
export async function runVSCodeCommand(
  page: BrowserPage,
  command: string,
  {
    typingDelay = 22,
    beforeSubmitPause = 900,
  }: { typingDelay?: number; beforeSubmitPause?: number } = {},
): Promise<void> {
  await page.keyboard.press(getCommandPaletteShortcut());
  await page.keyboard.type(command, { delay: typingDelay });
  if (beforeSubmitPause)
    await new Promise<void>((resolve) => setTimeout(resolve, beforeSubmitPause));
  await page.keyboard.press("Enter");
}
