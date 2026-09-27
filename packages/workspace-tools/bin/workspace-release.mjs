#!/usr/bin/env node
import { release } from "../src/release.mjs";

try {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const argument = args.find((arg) => !arg.startsWith("--"));
  release(argument, { dryRun });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
