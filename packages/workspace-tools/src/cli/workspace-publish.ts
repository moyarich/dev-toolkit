#!/usr/bin/env node
import { Argument, Option, program } from "commander";
import { publishWorkspacePackage } from "../publish.ts";

program
  .name("workspace-publish")
  .description("Validate and publish workspace packages.")
  .addArgument(
    new Argument("[package]", "Package name, directory, or workspace selector"),
  )
  .addOption(
    new Option("-r, --registry <registry>", "Registry to publish to")
      .choices(["github", "npm", "both"])
      .default("github"),
  )
  .addOption(
    new Option("-t, --tag <tag>", "npm distribution tag").default("latest"),
  )
  .addOption(
    new Option("-a, --access <access>", "Package access level")
      .choices(["public", "restricted"])
      .default("public"),
  )
  .option("-d, --dry-run", "Run release checks without publishing")
  .option("-l, --list", "Print the publish plan without publishing")
  .option("-j, --json", "Print the operation result as JSON")
  .option(
    "-w, --with-dependencies",
    "Include publishable workspace dependencies",
  )
  .option(
    "--no-verify-git-tag",
    "Allow publishing without verifying the matching package release Git tag",
  )
  .action((selector, options) => publishWorkspacePackage(selector, options));

await program.parseAsync();
