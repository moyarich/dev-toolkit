import { importHTMLElement } from "./import-html-element.ts";
import type { BrowserPage } from "../types.ts";

const captionUrl = new URL(import.meta.resolve("@moyarich/web-components/caption/element"));
const cursorUrl = new URL(import.meta.resolve("@moyarich/web-components/cursor-overlay/element"));
export interface DemoCaption { [key: string]: unknown }

export async function installDemoCursor({ page }: { page: BrowserPage }): Promise<void> {
  const tagName = "moyarich-cursor-overlay";
  await importHTMLElement({ page, tagName, componentUrl: cursorUrl });
  await page.evaluate((name: string) => { document.querySelector(name)?.remove(); document.documentElement.append(document.createElement(name)); }, tagName);
}
export async function showDemoCaption({ page, caption }: { page: BrowserPage; caption: DemoCaption }): Promise<void> {
  const tagName = "moyarich-caption-overlay";
  await importHTMLElement({ page, tagName, componentUrl: captionUrl });
  await page.evaluate(({ tagName, caption }: { tagName: string; caption: DemoCaption }) => {
    let element = document.querySelector<HTMLElement>(tagName);
    if (!element) { element = document.createElement(tagName); element.setAttribute("popover", "manual"); document.documentElement.append(element); }
    if (typeof element.showPopover === "function" && !element.matches(":popover-open")) element.showPopover();
    Reflect.set(element, "caption", { ...caption, visible: true });
  }, { tagName, caption });
}
export async function hideDemoCaption({ page }: { page: BrowserPage }): Promise<void> {
  await page.evaluate((tagName: string) => {
    const element = document.querySelector<HTMLElement>(tagName);
    if (!element) return;
    const caption = Reflect.get(element, "caption");
    Reflect.set(element, "caption", { ...(typeof caption === "object" && caption !== null ? caption : {}), visible: false });
  }, "moyarich-caption-overlay");
}
