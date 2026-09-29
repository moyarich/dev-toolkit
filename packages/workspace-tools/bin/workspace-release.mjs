#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { release } from "../src/release.mjs";

try {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const json = args.includes("--json");

  if (json && !dryRun) {
    throw new Error("--json is only supported with --dry-run.");
  }
  const modeArg = args.find((arg) => arg.startsWith("--mode="));
  const versionArg = args.find((arg) => arg.startsWith("--version="));
  const argument = args.find((arg) => !arg.startsWith("--"));
  const options = {
    dryRun,
    json,
    mode: modeArg?.slice("--mode=".length),
    version: versionArg?.slice("--version=".length),
  };

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
