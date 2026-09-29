import path from "node:path";
import { mkdir } from "node:fs/promises";
import type { BrowserLocator, BrowserPage } from "../types.mts";

export interface CaptureScreenshotOptions {
  page: BrowserPage;
  artifactsDirectory: string;
  name?: string;
  locator?: BrowserLocator;
  [key: string]: unknown;
}

export async function captureScreenshot({ page, artifactsDirectory, name = "screenshot.png", locator, ...options }: CaptureScreenshotOptions): Promise<string> {
  if (!page) throw new TypeError("captureScreenshot requires a Playwright page.");
  if (!artifactsDirectory) throw new TypeError("captureScreenshot requires artifactsDirectory.");
  await mkdir(artifactsDirectory, { recursive: true });
  const destination = path.resolve(artifactsDirectory, name);
  await (locator ?? page).screenshot({ path: destination, ...options });
  return destination;
}
