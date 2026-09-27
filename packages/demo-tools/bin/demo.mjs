#!/usr/bin/env node
import { discoverDemoStrategies, runDemoStrategies } from "../src/index.mjs";
import { selectDemoStrategies } from "../src/interactive.mjs";

const args = process.argv.slice(2);
const command = args[0] ?? (process.stdin.isTTY && process.stdout.isTTY ? "interactive" : "run");
const option = (name) => args.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const directory = option("strategies") ?? "demo/strategies";
const artifactsDirectory = option("artifacts");

if (command === "list") {
  const strategies = await discoverDemoStrategies({ directory });
  for (const { id, description, relativePath } of strategies) {
    console.log([id, description, relativePath].filter(Boolean).join("\t"));
  }
} else if (command === "interactive" || command === "select") {
  const selected = await selectDemoStrategies({ directory });
  if (selected.length) await runDemoStrategies({ directory, selected, ...(artifactsDirectory ? { artifactsDirectory } : {}) });
} else if (command === "run") {
  await runDemoStrategies({
    directory,
    selected: option("strategy") ?? "all",
    ...(artifactsDirectory ? { artifactsDirectory } : {}),
  });
} else {
  throw new Error(`Unknown demo command: ${command}`);
}
