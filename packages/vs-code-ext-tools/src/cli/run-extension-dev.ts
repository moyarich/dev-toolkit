import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { Option, program } from "commander";

import { runExtensionDev } from "../run-extension-dev.ts";

function commandExists(command: string): boolean {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [command], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function canUseFzf(enabled = true): boolean {
  return Boolean(
    enabled &&
      process.stdin.isTTY &&
      process.stdout.isTTY &&
      commandExists("fzf"),
  );
}

function selectWithFzf(
  choices: string[],
  prompt: string,
): string | undefined {
  if (!choices.length) return undefined;

  try {
    return (
      execFileSync(
        "fzf",
        [
          "--prompt",
          `${prompt} > `,
          "--height",
          "40%",
          "--layout",
          "reverse",
          "--border",
          "--select-1",
          "--exit-0",
        ],
        {
          input: `${choices.join("\n")}\n`,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "inherit"],
        },
      ).trim() || undefined
    );
  } catch (error: any) {
    if (error?.status === 1 || error?.status === 130) return undefined;
    throw error;
  }
}

function discoverExtensionDirectories(root = process.cwd()): string[] {
  const candidates = new Set<string>();

  if (existsSync(resolve(root, "package.json"))) {
    candidates.add(".");
  }

  for (const parent of [".", "packages", "apps"]) {
    const directory = resolve(root, parent);
    if (!existsSync(directory)) continue;

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const relative = parent === "." ? entry.name : `${parent}/${entry.name}`;
      const manifest = resolve(root, relative, "package.json");

      if (existsSync(manifest)) candidates.add(relative);
    }
  }

  return [...candidates].sort();
}

function discoverCodeCommands(): string[] {
  return ["code", "code-insiders", "codium"].filter(commandExists);
}

program
  .name("run-extension-dev")
  .description(
    "Build and open a local VS Code extension in an Extension Development Host.",
  )
  .argument("[directory]", "Extension project directory")
  .option("--code-command <command>", "VS Code executable")
  .option(
    "--debug-port <port>",
    "Extension debugger port",
    (value) => Number.parseInt(value, 10),
    Number.parseInt(process.env.EXTENSION_DEBUG_PORT ?? "9333", 10),
  )
  .addOption(new Option("--no-compile", "Skip npm run compile"))
  .addOption(
    new Option(
      "--no-open-devtools",
      "Do not open VS Code developer tools",
    ),
  )
  .addOption(
    new Option(
      "--no-new-window",
      "Reuse an existing VS Code window when possible",
    ),
  )
  .addOption(new Option("--no-fzf", "Disable automatic fzf selection"))
  .action(async (directory, options) => {
    const interactive = canUseFzf(options.fzf);

    const projectDirectory =
      directory ??
      (interactive
        ? selectWithFzf(discoverExtensionDirectories(), "Extension")
        : ".");

    if (!projectDirectory) {
      console.log("Extension selection cancelled.");
      return;
    }

    const codeCommand =
      options.codeCommand ??
      process.env.CODE_COMMAND ??
      (interactive
        ? selectWithFzf(discoverCodeCommands(), "VS Code")
        : undefined) ??
      "code";

    await runExtensionDev({
      projectDirectory,
      codeCommand,
      debugPort: options.debugPort,
      compile: options.compile,
      openDevtools: options.openDevtools,
      newWindow: options.newWindow,
    });
  });

await program.parseAsync();
