import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserLocator, BrowserPage } from "../types.mts";

const MAGNIFIER_CURSOR_TAG_NAME = "moyarich-magnifier-cursor-overlay";
const componentPath = fileURLToPath(import.meta.resolve("@moyarich/web-components/magnifier-cursor-overlay/element"));
const stylesheetPath = path.join(path.dirname(componentPath), "styles.css");
const componentSource = readFile(componentPath, "utf8");
const stylesheetSource = readFile(stylesheetPath, "utf8");

export async function installMagnifierCursorOverlay({ page }: { page: BrowserPage }): Promise<void> {
  const isRegistered = await page.evaluate((tagName: string) => Boolean(customElements.get(tagName)), MAGNIFIER_CURSOR_TAG_NAME);
  if (!isRegistered) {
    const session = await page.context().newCDPSession(page);
    try {
      const result = await session.send("Runtime.evaluate", {
        expression: `{\n${(await componentSource).replace('import styleSheet from "./styles.css" with { type: "css" };', `const styleSheet = new CSSStyleSheet();\nstyleSheet.replaceSync(${JSON.stringify(await stylesheetSource)});`).replace("export class MagnifierCursorOverlay", "class MagnifierCursorOverlay")}\n}\n//# sourceURL=${componentPath}`,
        awaitPromise: true,
      }) as { exceptionDetails?: { exception?: { description?: string }; text?: string } };
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "Could not register MagnifierCursorOverlay.");
    } finally { await session.detach(); }
  }
  await page.evaluate((tagName: string) => { document.querySelector(tagName)?.remove(); document.documentElement.append(document.createElement(tagName)); }, MAGNIFIER_CURSOR_TAG_NAME);
}

export async function pointDemoMagnifierCursorAt({ page, locator, pause = 500 }: { page: BrowserPage; locator: BrowserLocator; pause?: number }): Promise<void> {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error("Could not position the demo cursor on a hidden control.");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await new Promise<void>((resolve) => setTimeout(resolve, pause));
}

export async function removeMagnifierCursorOverlay({ page }: { page: BrowserPage }): Promise<void> {
  await page.evaluate((tagName: string) => { document.querySelector(tagName)?.remove(); }, MAGNIFIER_CURSOR_TAG_NAME);
}
