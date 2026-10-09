import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

import { downloadAndUnzipVSCode } from "@vscode/test-electron";

const CACHE_DIR_NAME = "vscode.test-electron-cache";

/**
 * Inputs used to resolve the shared VS Code test download cache.
 */
export interface VSCodeCachePathOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  home?: string;
}

/**
 * Options for running VS Code extension tests through `vscode-test`.
 */
export interface RunVSCodeTestsOptions extends VSCodeCachePathOptions {
  args?: string[];
  version?: string;
  cachePath?: string;
  command?: string;
}

const platformCacheRoots: Partial<
  Record<NodeJS.Platform, (home: string, env: NodeJS.ProcessEnv) => string>
> = {
  darwin: (home) => path.posix.join(home, "Library", "Caches"),
  win32: (home, env) =>
    env.LOCALAPPDATA ?? path.win32.join(home, "AppData", "Local"),
};

function defaultCacheRoot(
  home: string,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): string {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  return env.XDG_CACHE_HOME ?? pathApi.join(home, ".cache");
}

/**
 * Resolves the shared directory used by `@vscode/test-electron` for downloaded
 * VS Code builds.
 *
 * Set `VSCODE_TEST_CACHE` to override the platform default.
 */
export function getVSCodeCachePath({
  env = process.env,
  platform = process.platform,
  home = os.homedir(),
}: VSCodeCachePathOptions = {}): string {
  const pathApi = platform === "win32" ? path.win32 : path.posix;

  if (env.VSCODE_TEST_CACHE) {
    return pathApi.resolve(env.VSCODE_TEST_CACHE);
  }

  const resolveRoot = platformCacheRoots[platform];
  const root = resolveRoot
    ? resolveRoot(home, env)
    : defaultCacheRoot(home, env, platform);

  return pathApi.join(root, CACHE_DIR_NAME);
}

/**
 * Spawns `vscode-test` with an already-resolved VS Code executable path.
 *
 * The executable path is exposed as `VSCODE_TEST_EXECUTABLE_PATH` so the
 * consumer's `.vscode-test.ts` can select `useInstallation.fromPath`.
 */
export function runVSCodeTest(
  args: string[],
  vscodeExecutablePath: string,
  command = "vscode-test",
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        VSCODE_TEST_EXECUTABLE_PATH: vscodeExecutablePath,
      },
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

/**
 * Downloads or reuses a VS Code build from the shared cache and runs the
 * consumer's `vscode-test` configuration against that executable.
 */
export async function runVSCodeTests({
  args = [],
  env = process.env,
  platform = process.platform,
  home = os.homedir(),
  version = env.VSCODE_VERSION ?? "stable",
  cachePath = getVSCodeCachePath({ env, platform, home }),
  command = "vscode-test",
}: RunVSCodeTestsOptions = {}): Promise<number> {
  console.log(`VS Code test cache: ${cachePath}`);

  const vscodeExecutablePath = await downloadAndUnzipVSCode({
    version,
    cachePath,
  });

  const { code, signal } = await runVSCodeTest(
    args,
    vscodeExecutablePath,
    command,
  );

  if (signal) {
    process.kill(process.pid, signal);
    return 1;
  }

  return code ?? 1;
}
