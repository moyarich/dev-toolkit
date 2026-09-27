#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { runDemoStrategy } from "../src/index.mjs";

const program = new Command()
  .name("demo-strategy")
  .description("Run a demo strategy module directly.")
  .argument("<file>", "strategy module path")
  .option("-a, --artifacts <directory>", "override the strategy artifacts directory")
  .showHelpAfterError();

program.action(async (file, options) => {
  const modulePath = path.resolve(file);
  const module = await import(pathToFileURL(modulePath));
  const strategy = module.default ?? module.strategy;
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
