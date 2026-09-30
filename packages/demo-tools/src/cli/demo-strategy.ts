import path from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { runDemoStrategy } from "../index.ts";
import type { DemoStrategy } from "../types.ts";

const program = new Command();

program
  .name("demo-strategy")
  .description("Run a demo strategy module directly.")
  .argument("<file>", "strategy module path")
  .option("-a, --artifacts <directory>", "override the strategy artifacts directory")
  .showHelpAfterError();

program.action(async (file: string, options: { artifacts?: string }) => {
  const modulePath = path.resolve(file);
  const loaded = (await import(pathToFileURL(modulePath).href)) as {
    default?: DemoStrategy;
    strategy?: DemoStrategy;
  };
  const strategy = loaded.default ?? loaded.strategy;
  if (!strategy?.name || typeof strategy.run !== "function") {
    throw new Error(`Not a demo strategy module: ${modulePath}`);
  }
  await runDemoStrategy({
    strategy,
    moduleUrl: pathToFileURL(modulePath).href,
    ...(options.artifacts ? { artifactsDirectory: options.artifacts } : {}),
  });
});

await program.parseAsync(process.argv);
