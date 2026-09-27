import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

function dedent(source) {
  const lines = source.replace(/^\n+|\n+$/g, "").split("\n");
  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const width = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(width)).join("\n");
}

export function extractPageActions(source) {
  const start = source.indexOf("await page.");
  if (start === -1) throw new Error("Playwright codegen did not record any page actions.");
  const ends = ["// ---------------------", "await context.close()", "await browser.close()"]
    .map((marker) => source.indexOf(marker, start)).filter((index) => index !== -1);
  const actions = source.slice(start, ends.length ? Math.min(...ends) : source.length);\n  return dedent(actions.replace(/^[ \\t]+(?=await page\\.)/gm, ""));
}

export async function captureDemoStrategy({
  page,
  name,
  directory = path.resolve("demo/strategies/generated"),
  baseStrategy,
  testIdAttributeName = "data-testid",
  prepare,
}) {
  await mkdir(directory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const strategyName = `${path.basename(name)}-${timestamp}`;
  const outputFile = path.join(directory, `${strategyName}.codegen.mjs`);
  const context = page.context();
  if (typeof context._enableRecorder !== "function") throw new Error("This Playwright version does not support the Inspector recorder adapter.");
  await prepare?.({ page, name, baseStrategy });
  await context._enableRecorder({ language: "javascript", mode: "recording", testIdAttributeName, outputFile, handleSIGINT: false });
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  let finish;
  const interrupted = new Promise((resolve) => { finish = resolve; });
  process.once("SIGINT", finish);
  try {
    await Promise.race([interrupted, terminal.question("Finish recording: "), new Promise((resolve) => page.once("close", resolve))]);
  } finally {
    process.removeListener("SIGINT", finish);
    terminal.close();
    await context._disableRecorder().catch(() => undefined);
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  await access(outputFile);
  const actions = extractPageActions(await readFile(outputFile, "utf8"));
  const strategyFile = path.join(directory, strategyName, "index.mjs");
  await mkdir(path.dirname(strategyFile), { recursive: true });
  const source = `import { executableDemoStrategy } from "@moyarich/demo-tools";\n\nexport default executableDemoStrategy({\n  name: ${JSON.stringify(strategyName)},\n  async run({ page }) {\n${actions.split("\n").map((line)=>`    ${line}`).join("\n")}\n  },\n}, import.meta.url);\n`;
  await writeFile(strategyFile, source, "utf8");
  return strategyFile;
}
