#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const HELP = `Usage: discover-test-packages [directory] [options]

Discover workspace packages that define an npm test script.

Arguments:
  directory        Packages directory (default: packages)

Options:
  --json           Print compact JSON
  --pretty-json    Print formatted JSON
  -h, --help       Show this help

Output:
  TTY              Human-readable package list
  non-TTY          Compact JSON for scripts and CI
`;

function parseArgs(argv) {
  let directory = "packages";
  let format = process.stdout.isTTY ? "text" : "json";

  for (const arg of argv) {
    switch (arg) {
      case "-h":
      case "--help":
        return { help: true, directory, format };
      case "--json":
        format = "json";
        break;
      case "--pretty-json":
        format = "pretty-json";
        break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        if (directory !== "packages") {
          throw new Error(`Unexpected argument: ${arg}`);
        }
        directory = arg;
    }
  }

  return { help: false, directory, format };
}

export async function discoverTestPackages(root = "packages") {
  const entries = await readdir(root, { withFileTypes: true });
  const packages = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const packageFile = path.join(root, entry.name, "package.json");

    try {
      const manifest = JSON.parse(await readFile(packageFile, "utf8"));

      if (manifest.scripts?.test) {
        packages.push({
          directory: path.join(root, entry.name),
          name: manifest.name ?? entry.name,
        });
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

function printPackages(packages, format) {
  if (format === "json") {
    process.stdout.write(JSON.stringify(packages));
    return;
  }

  if (format === "pretty-json") {
    process.stdout.write(`${JSON.stringify(packages, null, 2)}\n`);
    return;
  }

  if (packages.length === 0) {
    process.stdout.write("No packages with tests found.\n");
    return;
  }

  process.stdout.write(`Packages with tests (${packages.length}):\n\n`);
  for (const pkg of packages) {
    process.stdout.write(`  ${pkg.name}\n    ${pkg.directory}\n`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(HELP);
    return;
  }

  const packages = await discoverTestPackages(options.directory);
  printPackages(packages, options.format);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main().catch((error) => {
    process.stderr.write(`discover-test-packages: ${error.message}\n`);
    process.exitCode = 1;
  });
}
