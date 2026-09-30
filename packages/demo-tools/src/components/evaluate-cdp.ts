import { readFile } from "node:fs/promises";
import type { BrowserPage } from "../types.ts";

export interface EvaluateComponentOptions {
  page: BrowserPage;
  componentUrl: string | URL;
  transform?: (source: string) => string | Promise<string>;
}

export async function evaluateComponentViaCDP({ page, componentUrl, transform = (source) => source }: EvaluateComponentOptions): Promise<void> {
  const source = await readFile(componentUrl, "utf8");
  const expression = await transform(source);
  const session = await page.context().newCDPSession(page);
  try {
    const result = await session.send("Runtime.evaluate", { expression, awaitPromise: true }) as { exceptionDetails?: { exception?: { description?: string }; text?: string } };
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "Component evaluation failed.");
  } finally { await session.detach(); }
}
