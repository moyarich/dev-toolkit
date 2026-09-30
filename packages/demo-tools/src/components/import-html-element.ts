import { readFile } from "node:fs/promises";
import type { BrowserPage } from "../types.ts";

export interface ImportHTMLElementOptions {
  page: BrowserPage;
  tagName: string;
  componentUrl: URL;
}

export async function importHTMLElement({
  page,
  tagName,
  componentUrl,
}: ImportHTMLElementOptions): Promise<void> {
  const isRegistered = await page.evaluate(
    (name: string) => Boolean(customElements.get(name)),
    tagName,
  );
  if (isRegistered) return;
  const styleUrl = new URL(
    componentUrl.pathname.replace(/\.(mjs|js)$/, "-style.css"),
    componentUrl,
  );
  const [componentSource, styleSource] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(styleUrl, "utf8"),
  ]);
  const relativeStyleUrl = `./${styleUrl.pathname.split("/").at(-1)}`;
  const embeddedStyleUrl = `data:text/css;base64,${Buffer.from(styleSource).toString("base64")}`;
  const escapedRelativePath = relativeStyleUrl.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const importRegex = new RegExp(`(['"])${escapedRelativePath}\\1`, "g");
  const browserModuleSource = componentSource.replace(importRegex, `"${embeddedStyleUrl}"`);
  const browserModuleUrl = `data:text/javascript;base64,${Buffer.from(browserModuleSource).toString("base64")}`;
  await page.evaluate(async (moduleUrl: string) => {
    await import(moduleUrl);
  }, browserModuleUrl);
}
