#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { program } from 'commander';
import { release } from "../src/release.mjs";

program
  .name("workspace-release")
  .description("Preview or create a workspace package release.")
  .argument("<package=version>", "Workspace selector and version or bump")
  .option("--dry-run", "Preview without changing repository files", false)
  .option("--json", "Print the dry-run result as JSON", false)
  .option("--mode <mode>", "Version mode: bump, exact, or existing")
  .option("--version <version>", "Override the version or bump in the argument");

try {
  program.parse();
  const [argument] = program.args;
  const options = program.opts();
  const { dryRun, json } = options;

  if (json && !dryRun) {
    throw new Error("--json is only supported with --dry-run.");
  }

  if (!dryRun && input.isTTY && output.isTTY) {
    release(argument, { ...options, dryRun: true });
    const readline = createInterface({ input, output });
    const answer = await readline.question("\nCreate this release? [y/N] ");
    readline.close();
    if (!/^(y|yes)$/i.test(answer.trim())) {
      console.log("Release cancelled.");
      process.exit(0);
    }
  }

  const result = release(argument, options);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
