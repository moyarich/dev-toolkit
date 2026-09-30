#!/usr/bin/env node
import { Argument, Option, program } from "commander";
import { discoverTestPackages } from "../discover-test-packages.ts";

program
  .name("discover-test-packages")
  .description("Discover workspace packages that define an npm test script.")
  .addArgument(new Argument("[directory]", "Packages directory").default("packages"))
  .addOption(new Option("--format <format>", "Output format").choices(["text", "json", "pretty-json"]))
  .option("--json", "Print compact JSON")
  .option("--pretty-json", "Print formatted JSON")
  .action(async (directory, options) => {
    const packages = await discoverTestPackages(directory);
    const format = options.json ? "json" : options.prettyJson ? "pretty-json" : options.format ?? (process.stdout.isTTY ? "text" : "json");
    if (format === "json") process.stdout.write(JSON.stringify(packages));
    else if (format === "pretty-json") process.stdout.write(`${JSON.stringify(packages, null, 2)}\n`);
    else if (!packages.length) process.stdout.write("No packages with tests found.\n");
    else {
      process.stdout.write(`Packages with tests (${packages.length}):\n\n`);
      for (const pkg of packages) process.stdout.write(`  ${pkg.name}\n    ${pkg.directory}\n`);
    }
  });

await program.parseAsync();
