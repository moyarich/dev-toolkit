#!/usr/bin/env node
import { discoverDemoStrategies, runDemoStrategies } from "../src/index.mjs";

const args = process.argv.slice(2);
const command = args[0] ?? "run";
const option = (name) => args.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const directory = option("strategies") ?? "demo/strategies";

if (command === "list") {
  const strategies = await discoverDemoStrategies({ directory });
  for (const { id, strategy } of strategies) {
    console.log(strategy.description ? `${id} - ${strategy.description}` : id);
  }
} else if (command === "run") {
  await runDemoStrategies({
    directory,
    selected: option("strategy") ?? "all",
    artifactsDirectory: option("artifacts") ?? "demo/artifacts",
  });
} else {
  throw new Error(`Unknown demo command: ${command}`);
}
