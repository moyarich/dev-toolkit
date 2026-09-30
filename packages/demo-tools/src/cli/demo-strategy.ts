import path from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { assertDemoStrategy, runDemoStrategy } from "../index.ts";

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
    default?: unknown;
    strategy?: unknown;
  };
  const strategy = loaded.default ?? loaded.strategy;
  assertDemoStrategy(strategy);
  await runDemoStrategy({
    strategy,
    moduleUrl: pathToFileURL(modulePath).href,
    ...(options.artifacts ? { artifactsDirectory: options.artifacts } : {}),
  });
});

await program.parseAsync(process.argv);
