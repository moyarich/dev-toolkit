#!/usr/bin/env node

import { runVSCodeTests } from "../run-vscode-tests.ts";

try {
  process.exitCode = await runVSCodeTests({
    args: process.argv.slice(2),
  });
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
