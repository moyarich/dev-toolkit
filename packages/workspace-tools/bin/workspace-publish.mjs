#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { program } from 'commander';
import { Option } from "commander";
import { publish } from "../src/publish.mjs";

function boolean(value) {
  if (value === undefined || value === true) return true;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("Boolean options must be true or false.");
}

program
  .name("workspace-publish")
  .description("Validate and publish an npm workspace package.")
  .argument("[package]", "Workspace path, directory name, or package name")
  .addOption(new Option("--registry <registry>", "Publish registry").choices(["github", "npm", "both"]).default("github"))
  .option("--tag <tag>", "npm distribution tag", "latest")
  .addOption(new Option("--access <access>", "Package access").choices(["public", "restricted"]).default("public"))
  .option("--ls [boolean]", "List the registry-aware publish plan", boolean, false)
  .option("--with-dependencies [boolean]", "Include internal workspace dependencies", boolean, false)
  .option("--dry-run [boolean]", "Validate without publishing", boolean, false);

try {
  program.parse();
  const [selector] = program.args;
  const parsed = program.opts();
  const options = {
    selector,
    registry: parsed.registry,
    tag: parsed.tag,
    access: parsed.access,
    dryRun: parsed.dryRun,
    list: parsed.ls,
    withDependencies: parsed.withDependencies,
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
