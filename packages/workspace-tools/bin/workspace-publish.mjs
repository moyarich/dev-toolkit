#!/usr/bin/env node
import { publish } from "../src/publish.mjs";

const args = process.argv.slice(2);
const selector = args.find((arg) => !arg.startsWith("--"));
const value = (name, fallback) => {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};
const boolean = (name, fallback = false) => {
  const raw = value(name);
  if (raw === undefined) return args.includes(`--${name}`) ? true : fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`--${name} must be true or false.`);
};

try {
  publish({
    selector,
    registry: value("registry", "github"),
    tag: value("tag", "latest"),
    access: value("access", "public"),
    dryRun: boolean("dry-run"),
    list: boolean("ls"),
    withDependencies: boolean("with-dependencies"),
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
