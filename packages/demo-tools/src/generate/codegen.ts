import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import type { BrowserPage, DemoStrategy } from "../types.ts";

interface RecorderContext {
  _enableRecorder?(options: {
    language: string;
    mode: string;
    testIdAttributeName: string;
    outputFile: string;
    handleSIGINT: boolean;
  }): Promise<void>;
  _disableRecorder?(): Promise<void>;
}
export interface CaptureDemoStrategyOptions {
  page: BrowserPage;
  name: string;
  directory?: string;
  baseStrategy?: DemoStrategy;
  testIdAttributeName?: string;
  prepare?: (context: {
    page: BrowserPage;
    name: string;
    baseStrategy?: DemoStrategy;
  }) => void | Promise<void>;
}

export function extractPageActions(source: string): string {
  const start = source.indexOf("await page.");
  if (start === -1) throw new Error("Playwright codegen did not record any page actions.");
  const ends = ["// ---------------------", "await context.close()", "await browser.close()"]
    .map((marker) => source.indexOf(marker, start))
    .filter((index) => index !== -1);
  const actions = source.slice(start, ends.length ? Math.min(...ends) : source.length);
  return actions
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export async function captureDemoStrategy({
  page,
  name,
  directory = path.resolve("demo/strategies/generated"),
  baseStrategy,
  testIdAttributeName = "data-testid",
  prepare,
}: CaptureDemoStrategyOptions): Promise<string> {
  await mkdir(directory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const strategyName = `${path.basename(name)}-${timestamp}`;
  const outputFile = path.join(directory, `${strategyName}.codegen.mjs`);
  const context = page.context() as ReturnType<BrowserPage["context"]> & RecorderContext;
  if (
    typeof context._enableRecorder !== "function" ||
    typeof context._disableRecorder !== "function"
  )
    throw new Error("This Playwright version does not support the Inspector recorder adapter.");
  await prepare?.({ page, name, baseStrategy });
  await context._enableRecorder({
    language: "javascript",
    mode: "recording",
    testIdAttributeName,
    outputFile,
    handleSIGINT: false,
  });
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  let finish: (() => void) | undefined;
  const interrupted = new Promise<void>((resolve) => {
    finish = resolve;
  });
  if (!finish) throw new Error("Could not initialize recorder interrupt handler.");
  process.once("SIGINT", finish);
  try {
    await Promise.race([
      interrupted,
      terminal.question("Finish recording: "),
      new Promise<void>((resolve) => {
        page.once("close", () => resolve());
      }),
    ]);
  } finally {
    process.removeListener("SIGINT", finish);
    terminal.close();
    await context._disableRecorder().catch(() => undefined);
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 300));
  await access(outputFile);
  const actions = extractPageActions(await readFile(outputFile, "utf8"));
  const strategyFile = path.join(directory, strategyName, "index.mjs");
  await mkdir(path.dirname(strategyFile), { recursive: true });
  const source = `import { executableDemoStrategy } from "@moyarich/demo-tools";\n\nexport default executableDemoStrategy({\n  name: ${JSON.stringify(strategyName)},\n  async run({ page }) {\n${actions
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n")}\n  },\n}, import.meta.url);\n`;
  await writeFile(strategyFile, source, "utf8");
  return strategyFile;
}
