import { createRequire } from "node:module";
import { runProcess } from "../utils/process.ts";

export async function installDemoBrowser({
  browser = "chromium",
}: { browser?: string } = {}): Promise<void> {
  const cli = createRequire(import.meta.url).resolve("playwright-core/cli");
  await runProcess(process.execPath, [cli, "install", browser]);
}
