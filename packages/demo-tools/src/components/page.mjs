import { importHTMLElement } from "./import-html-element.mjs";

const captionUrl = new URL("./demo-caption/demo-caption-element.mjs", import.meta.url);
const cursorUrl = new URL("./demo-cursor-overlay/demo-cursor-overlay-element.mjs", import.meta.url);

export async function installDemoCursor({ page }) {
  const tagName = "demo-cursor-overlay";
  await importHTMLElement({ page, tagName, componentUrl: cursorUrl });
  await page.evaluate((name) => {
    document.querySelector(name)?.remove();
    document.documentElement.append(document.createElement(name));
  }, tagName);
}

export async function showDemoCaption({ page, caption }) {
  const tagName = "demo-caption";
  await importHTMLElement({ page, tagName, componentUrl: captionUrl });
  await page.evaluate(({ tagName, caption }) => {
    let element = document.querySelector(tagName);
    if (!element) {
      element = document.createElement(tagName);
      element.setAttribute("popover", "manual");
      document.documentElement.append(element);
    }
    if (typeof element.showPopover === "function" && !element.matches(":popover-open")) element.showPopover();
    element.caption = { ...caption, visible: true };
  }, { tagName, caption });
}

export async function hideDemoCaption({ page }) {
  await page.evaluate((tagName) => {
    const element = document.querySelector(tagName);
    if (element) element.caption = { ...element.caption, visible: false };
  }, "demo-caption");
}
