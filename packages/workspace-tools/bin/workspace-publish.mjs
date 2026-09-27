#!/usr/bin/env node
import { publish } from "../src/publish.mjs";

const args = process.argv.slice(2);
const selector = args.find((arg) => !arg.startsWith("--"));
const value = (name, fallback) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};

try {
  publish({
    selector,
    registry: value("registry", "github"),
    tag: value("tag", "latest"),
    access: value("access", "public"),
    dryRun: args.includes("--dry-run"),
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
