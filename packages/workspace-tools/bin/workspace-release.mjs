#!/usr/bin/env node
import { release } from "../src/release.mjs";

try {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const modeArg = args.find((arg) => arg.startsWith("--mode="));
  const versionArg = args.find((arg) => arg.startsWith("--version="));
  const argument = args.find((arg) => !arg.startsWith("--"));
  release(argument, {
    dryRun,
    mode: modeArg?.slice("--mode=".length),
    version: versionArg?.slice("--version=".length),
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
