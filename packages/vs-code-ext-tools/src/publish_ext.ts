#!/usr/bin/env node

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

import { confirm } from "@inquirer/prompts";
import { Argument, program } from "commander";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const environmentFile = resolve(projectDirectory, ".env");

const marketplaces = {
  vscode: {
    name: "VS Code Marketplace",
    requiredEnv: ["VSCE_PAT"],
    command: ["npx", "@vscode/vsce", "publish"],
  },

  openvsx: {
    name: "Open VSX",
    requiredEnv: ["OVSX_PAT"],
    command: ["npx", "ovsx", "publish"],
  },
};

function runCliCommand(command, args = []) {
  const result = spawnSync(command, args, {
    cwd: projectDirectory,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function loadEnvironment() {
  if (existsSync(environmentFile)) {
    loadEnvFile(environmentFile);
  }
}

function validateMarketplaceEnvironment(marketplace) {
  const missingEnvironmentVariables = marketplace.requiredEnv.filter(
    (name) => !process.env[name],
  );

  if (missingEnvironmentVariables.length === 0) {
    return true;
  }

  console.error(
    [
      `Missing credentials required for ${marketplace.name}:`,
      ...missingEnvironmentVariables.map((name) => `  - ${name}`),
    ].join("\n"),
  );

  return false;
}

export async function publishExtension(marketplaceId, publishArgs) {
  const marketplace = marketplaces[marketplaceId];

  console.log("Recording demos and generating current README GIFs...");
  runCliCommand("node", ["./demo/create-readme-gif.mjs"]);

  console.log("Running release checks...");
  runCliCommand("npm", ["test"]);

  console.log("Verifying the extension package...");
  runCliCommand("npm", ["run", "package:ls"]);

  const shouldPublish = await confirm({
    message: `Publish extension to the ${marketplace.name}?`,
    default: false,
  });

  if (!shouldPublish) {
    console.log(`${marketplace.name} publication cancelled.`);
    process.exitCode = 1;
    return;
  }

  loadEnvironment();

  if (!validateMarketplaceEnvironment(marketplace)) {
    process.exitCode = 1;
    return;
  }

  const [command, ...commandArgs] = marketplace.command;

  console.log(`Publishing extension to the ${marketplace.name}...`);

  runCliCommand(command, [...commandArgs, ...publishArgs]);
}

program
  .name("publish")
  .description("Validate and publish the extension.")
  .addArgument(
    new Argument("[marketplace]", "Marketplace to publish to")
      .choices(Object.keys(marketplaces))
      .default("vscode"),
  )
  .argument(
    "[publishArgs...]",
    "Arguments passed to the marketplace publisher",
  )
  .allowUnknownOption()
  .action(publishExtension);

await program.parseAsync();