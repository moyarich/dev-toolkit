export function getCommandPaletteShortcut(platform = process.platform) {
  return platform === "darwin" ? "Meta+Shift+P" : "Control+Shift+P";
}

export function getQuickOpenShortcut(platform = process.platform) {
  return platform === "darwin" ? "Meta+P" : "Control+P";
}

export async function runVSCodeCommand(page, command, {
  typingDelay = 22,
  beforeSubmitPause = 900,
} = {}) {
  await page.keyboard.press(getCommandPaletteShortcut());
  await page.keyboard.type(command, { delay: typingDelay });
  if (beforeSubmitPause) {
    await new Promise((resolve) => setTimeout(resolve, beforeSubmitPause));
  }
  await page.keyboard.press("Enter");
}
