#!/usr/bin/env node
import { Command } from "commander";
import { discoverDemoStrategies, runDemoStrategies, selectDemoStrategies } from "../src/index.mjs";

const program = new Command()
  .name("demo")
  .description("Discover, select, and run self-contained demo strategies.")
  .version("0.0.0")
  .option("-d, --strategies <directory>", "strategy root directory", "demo/strategies")
  .option("-a, --artifacts <directory>", "override the artifacts output directory")
  .showHelpAfterError();

program
  .command("list")
  .description("List discovered demo strategies.")
  .option("--json", "print discovered strategies as JSON")
  .action(async (options) => {
    const root = program.opts();
    const strategies = await discoverDemoStrategies({ directory: root.strategies });
    if (options.json) {
      console.log(JSON.stringify(strategies.map(({ id, description, relativePath, modulePath }) => ({
        id, description, relativePath, modulePath,
      })), null, 2));
      return;
    }
    for (const { id, description, relativePath } of strategies) {
      console.log([id, description, relativePath].filter(Boolean).join("\t"));
    }
  });

program
  .command("run")
  .description("Run discovered demo strategies.")
  .argument("[strategies...]", "strategy names; omit to run all")
  .option("-s, --strategy <name...>", "strategy names (repeat or provide multiple)")
  .action(async (arguments_, options) => {
    const root = program.opts();
    const selected = [...(arguments_ ?? []), ...(options.strategy ?? [])];
    await runDemoStrategies({
      directory: root.strategies,
      selected: selected.length ? selected : "all",
      ...(root.artifacts ? { artifactsDirectory: root.artifacts } : {}),
    });
  });

program
  .command("select", { isDefault: process.stdin.isTTY && process.stdout.isTTY })
  .alias("interactive")
  .description("Select one or more discovered strategies with fzf.")
  .action(async () => {
    const root = program.opts();
    const selected = await selectDemoStrategies({ directory: root.strategies });
    if (!selected.length) return;
    await runDemoStrategies({
      directory: root.strategies,
      selected,
      ...(root.artifacts ? { artifactsDirectory: root.artifacts } : {}),
    });
  });

if (process.argv.length === 2 && !(process.stdin.isTTY && process.stdout.isTTY)) {
  process.argv.push("run");
}

await program.parseAsync(process.argv);
