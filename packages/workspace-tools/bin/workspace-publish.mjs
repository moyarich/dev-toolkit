#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
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
  const options = {
    selector,
    registry: value("registry", "github"),
    tag: value("tag", "latest"),
    access: value("access", "public"),
    dryRun: boolean("dry-run"),
    list: boolean("ls"),
    withDependencies: boolean("with-dependencies"),
  };

  if (!options.list && !options.dryRun && input.isTTY && output.isTTY) {
    publish({ ...options, list: true });
    const readline = createInterface({ input, output });
    const answer = await readline.question("\nPublish this plan? [y/N] ");
    readline.close();
    if (!/^(y|yes)$/i.test(answer.trim())) {
      console.log("Publish cancelled.");
      process.exit(0);
    }
  }

  publish(options);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
