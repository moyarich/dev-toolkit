import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";

export interface RunExtensionDevOptions {
  projectDirectory?: string;
  codeCommand?: string;
  debugPort?: number;
  compile?: boolean;
  openDevtools?: boolean;
  newWindow?: boolean;
}

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited from signal ${signal}.`));
      } else if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${command} exited with code ${code ?? 1}.`));
      }
    });
  });
}

export async function runExtensionDev(
  options: RunExtensionDevOptions = {},
): Promise<void> {
  const projectDirectory = resolve(options.projectDirectory ?? process.cwd());
  const codeCommand = options.codeCommand ?? process.env.CODE_COMMAND ?? "code";
  const debugPort =
    options.debugPort ??
    Number.parseInt(process.env.EXTENSION_DEBUG_PORT ?? "9333", 10);

  await access(resolve(projectDirectory, "package.json"));

  if (options.compile !== false) {
    console.log(`Building extension in ${projectDirectory}...`);
    await run("npm", ["run", "compile"], projectDirectory);
  }

  const args = [
    ...(options.newWindow === false ? [] : ["--new-window"]),
    ...(options.openDevtools === false ? [] : ["--open-devtools"]),
    `--inspect-extensions=${debugPort}`,
    `--extensionDevelopmentPath=${projectDirectory}`,
    projectDirectory,
  ];

  console.log(
    `Opening VS Code Extension Development Host on debugger port ${debugPort}...`,
  );

  await run(codeCommand, args, projectDirectory);
}
