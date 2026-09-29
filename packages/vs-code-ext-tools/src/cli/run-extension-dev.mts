#!/usr/bin/env node
import { Option, program } from "commander";

import { runExtensionDev } from "../run-extension-dev.mts";

program
  .name("run-extension-dev")
  .description("Build and open a local VS Code extension in an Extension Development Host.")
  .argument("[directory]", "Extension project directory", ".")
  .option("--code-command <command>", "VS Code executable", process.env.CODE_COMMAND ?? "code")
  .option("--debug-port <port>", "Extension debugger port", (value) => Number.parseInt(value, 10), Number.parseInt(process.env.EXTENSION_DEBUG_PORT ?? "9333", 10))
  .addOption(new Option("--no-compile", "Skip npm run compile"))
  .addOption(new Option("--no-open-devtools", "Do not open VS Code developer tools"))
  .addOption(new Option("--no-new-window", "Reuse an existing VS Code window when possible"))
  .action(async (directory, options) => {
    await runExtensionDev({
      projectDirectory: directory,
      codeCommand: options.codeCommand,
      debugPort: options.debugPort,
      compile: options.compile,
      openDevtools: options.openDevtools,
      newWindow: options.newWindow,
    });
  });

await program.parseAsync();
