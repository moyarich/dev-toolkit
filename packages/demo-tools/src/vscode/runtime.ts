import { access, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { connectToVSCode } from "./devtools.ts";
import { createVSCodeEnvironment } from "./environment.ts";
import { freePort, runProcess } from "../utils/index.ts";
import type { BrowserPage, Chromium } from "../types.ts";

/** Entry point executed by the VS Code extension test host. */
const extensionHostPath = fileURLToPath(new URL("./extension-host.cjs", import.meta.url));

const CACHE_DIRECTORY_NAME = "moyarich-vscode-test-cache";

/** Command and arguments used to build an extension. */
export interface BuildCommand {
  /** Executable to run. */
  command: string;

  /** Arguments passed to the executable. */
  args?: string[];
}

/** Required methods from the VS Code extension test runner. */
export interface TestElectron {
  /**
   * Downloads and extracts a VS Code build.
   *
   * @param options - Version and cache directory.
   * @returns Path to the VS Code executable.
   */
  downloadAndUnzipVSCode(options: { version: string; cachePath: string }): Promise<string>;

  /**
   * Launches VS Code and executes extension tests.
   *
   * @param options - Extension test configuration.
   * @returns Result of the test run.
   */
  runTests(options: Record<string, unknown>): Promise<unknown>;
}

/** Options for verifying or building an extension. */
interface EnsureExtensionOptions {
  /** Extension development directory. */
  developmentPath: string;

  /** Build script name or command to run if package.json is unavailable. */
  build?: string | BuildCommand;

  /** Working directory for the build command. */
  cwd: string;
}

/**
 * Ensures the extension development directory contains package.json.
 *
 * If the file is unavailable, runs the configured build command and
 * checks for the file again.
 *
 * @param options - Extension directory and build configuration.
 * @throws If package.json is unavailable and no build command is provided.
 */
async function ensureExtension({
  developmentPath,
  build,
  cwd,
}: EnsureExtensionOptions): Promise<void> {
  const packagePath = path.join(developmentPath, "package.json");

  try {
    await access(packagePath);
    return;
  } catch {
    // Attempt to build the extension.
  }

  if (!build) {
    throw new Error(`VS Code extension is not built: ${developmentPath}`);
  }

  const command: BuildCommand =
    typeof build === "string" ? { command: "npm", args: ["run", build] } : build;

  await runProcess(command.command, command.args ?? [], { cwd });
  await access(packagePath);
}

/** Options for resolving the shared VS Code download cache. */
export interface VSCodeCachePathOptions {
  /** Target platform. Defaults to process.platform. */
  platform?: NodeJS.Platform;

  /** Home directory. Defaults to os.homedir(). */
  homeDirectory?: string;

  /** Environment variables. Defaults to process.env. */
  environment?: NodeJS.ProcessEnv;
}

/**
 * Resolves the shared cache directory for downloaded VS Code test builds.
 *
 * Downloaded builds are reusable across runs. Mutable test state is
 * stored separately in temporary directories.
 *
 * Resolution order:
 * 1. DEMO_TOOLS_VSCODE_CACHE, when set.
 * 2. macOS: ~/Library/Caches/moya-vscode-test
 * 3. Windows: %LOCALAPPDATA%/moya-vscode-test
 * 4. Other platforms: $XDG_CACHE_HOME/moya-vscode-test
 *    (defaults to ~/.cache/moya-vscode-test).
 *
 * Relative XDG_CACHE_HOME values are ignored according to the
 * XDG Base Directory Specification.
 *
 * This function does not create the cache directory.
 *
 * @param options - Optional platform, home directory, and environment overrides.
 * @returns Path to the shared VS Code download cache.
 * @see https://specifications.freedesktop.org/basedir-spec/latest/
 */
export function getVSCodeCachePath({
  platform = process.platform,
  homeDirectory = os.homedir(),
  environment = process.env,
}: VSCodeCachePathOptions = {}): string {
  const override = environment.DEMO_TOOLS_VSCODE_CACHE;

  if (override) {
    return path.resolve(override);
  }

  if (platform === "darwin") {
    return path.join(homeDirectory, "Library", "Caches", CACHE_DIRECTORY_NAME);
  }

  if (platform === "win32") {
    const localAppData =
      environment.LOCALAPPDATA || path.win32.join(homeDirectory, "AppData", "Local");

    return path.win32.join(localAppData, CACHE_DIRECTORY_NAME);
  }

  const xdgCacheHome = environment.XDG_CACHE_HOME;

  const cacheHome =
    xdgCacheHome && path.isAbsolute(xdgCacheHome)
      ? xdgCacheHome
      : path.join(homeDirectory, ".cache");

  return path.join(cacheHome, CACHE_DIRECTORY_NAME);
}

/** Options for preparing a VS Code executable. */
export interface PrepareVSCodeExecutableOptions {
  /** VS Code extension test runner. */
  testElectron: TestElectron;

  /** Extension development directory. */
  developmentPath: string;

  /** Optional extension build command. */
  build?: string | BuildCommand;

  /** Build working directory. Defaults to process.cwd(). */
  projectDirectory?: string;

  /** VS Code version. Defaults to VSCODE_VERSION or "stable". */
  version?: string;

  /** Download cache directory. Defaults to getVSCodeCachePath(). */
  cachePath?: string;
}

/**
 * Prepares a VS Code executable for extension testing.
 *
 * Verifies the extension development directory and downloads the
 * requested VS Code build using the configured cache.
 *
 * @param options - Extension build and VS Code download options.
 * @returns Path to the downloaded VS Code executable.
 * @throws If the test runner does not provide downloadAndUnzipVSCode.
 */
export async function prepareVSCodeExecutable({
  testElectron,
  developmentPath,
  build,
  projectDirectory = process.cwd(),
  version = process.env.VSCODE_VERSION ?? "stable",
  cachePath = getVSCodeCachePath(),
}: PrepareVSCodeExecutableOptions): Promise<string> {
  if (typeof testElectron?.downloadAndUnzipVSCode !== "function") {
    throw new TypeError("prepareVSCodeExecutable requires @vscode/test-electron.");
  }

  await ensureExtension({
    developmentPath,
    build,
    cwd: projectDirectory,
  });

  return testElectron.downloadAndUnzipVSCode({
    version,
    cachePath,
  });
}

/**
 * Runtime resources for a VS Code extension demo.
 *
 * Use complete() to finish the test run and dispose() to release
 * temporary resources.
 */
export interface VSCodeDemoRuntime {
  /** Root temporary directory for this runtime. */
  temporaryDirectory: string;

  /** Isolated VS Code user data directory. */
  userDataDirectory: string;

  /** Isolated workspace directory. */
  workspaceDirectory: string;

  /** Isolated extensions directory. */
  extensionsDirectory: string;

  /** File used to signal test completion. */
  completionFile: string;

  /** Port used for remote debugging. */
  remoteDebuggingPort: number;

  /** Source file created for the demo, if provided. */
  sourceFile?: string;

  /** Browser debugging endpoint. */
  endpoint: string;

  /** Browser connection. */
  browser: { close(): Promise<void> };

  /** Connected VS Code browser page. */
  page: BrowserPage;

  /**
   * Signals completion and waits for the extension test run.
   *
   * @returns A promise that settles with the test run.
   */
  complete(): Promise<void>;

  /**
   * Signals completion, waits for the test run, closes the browser,
   * and removes the temporary directory.
   *
   * @returns A promise that resolves when cleanup finishes.
   */
  dispose(): Promise<void>;
}

/** Options for creating a VS Code extension demo runtime. */
export interface CreateVSCodeDemoRuntimeOptions {
  /** VS Code extension test runner. */
  testElectron: TestElectron;

  /** Chromium implementation used for debugging. */
  chromium: Chromium;

  /** Extension identifier. */
  extensionId: string;

  /** Extension development directory. */
  developmentPath: string;

  /** Path to the VS Code executable. */
  vscodeExecutablePath: string;

  /** VS Code settings applied to the isolated environment. */
  settings?: Record<string, unknown>;

  /** Additional VS Code launch arguments. */
  launchArgs?: string[];

  /** Browser viewport. Defaults to 1280 by 900. */
  viewport?: { width: number; height: number };

  /** Optional source content to write into the workspace. */
  source?: string;

  /** Source filename. Defaults to "demo.txt". */
  sourceFileName?: string;

  /** Optional setup value passed to the extension host. */
  hostSetup?: string;

  /** Extension host timeout in milliseconds. Defaults to 120000. */
  hostTimeout?: number;

  /**
   * Callback invoked after the browser connection is initialized.
   *
   * @param runtime - Initialized demo runtime.
   */
  waitForReady?: (runtime: VSCodeDemoRuntime) => void | Promise<void>;
}

/**
 * Creates an isolated VS Code extension demo runtime.
 *
 * Sets up temporary VS Code directories, starts the extension test
 * runner, and connects Chromium to the VS Code debugging endpoint.
 *
 * The returned runtime provides methods to signal test completion
 * and clean up resources.
 *
 * @param options - Extension, browser, and runtime configuration.
 * @returns The initialized demo runtime.
 * @throws If required configuration is missing or initialization fails.
 */
export async function createVSCodeDemoRuntime({
  testElectron,
  chromium,
  extensionId,
  developmentPath,
  vscodeExecutablePath,
  settings = {},
  launchArgs = [],
  viewport = { width: 1280, height: 900 },
  source,
  sourceFileName = "demo.txt",
  hostSetup,
  hostTimeout = 120_000,
  waitForReady,
}: CreateVSCodeDemoRuntimeOptions): Promise<VSCodeDemoRuntime> {
  if (typeof testElectron?.runTests !== "function") {
    throw new TypeError("createVSCodeDemoRuntime requires @vscode/test-electron.");
  }

  if (!extensionId) {
    throw new TypeError("createVSCodeDemoRuntime requires extensionId.");
  }

  if (!developmentPath) {
    throw new TypeError("createVSCodeDemoRuntime requires developmentPath.");
  }

  const env = await createVSCodeEnvironment({
    settings,
    prefix: "vscode-demo-",
  });

  const extensionsDirectory = path.join(env.temporaryDirectory, "extensions");

  const completionFile = path.join(env.temporaryDirectory, "done");

  let browser: { close(): Promise<void> } | undefined;
  let testRun: Promise<unknown> | undefined;

  /**
   * Writes the completion signal consumed by the extension host.
   */
  const signalCompletion = async (): Promise<void> => {
    await writeFile(completionFile, "done");
  };

  /**
   * Releases resources associated with the runtime.
   *
   * Individual completion and browser-close errors are ignored;
   * removal errors are propagated.
   */
  const cleanup = async (): Promise<void> => {
    await signalCompletion().catch(() => undefined);
    await testRun?.catch(() => undefined);
    await browser?.close().catch(() => undefined);

    await rm(env.temporaryDirectory, {
      recursive: true,
      force: true,
    });
  };

  try {
    const remoteDebuggingPort = await freePort();

    await mkdir(extensionsDirectory, {
      recursive: true,
    });

    let sourceFile: string | undefined;

    if (source !== undefined) {
      sourceFile = path.join(env.workspaceDirectory, sourceFileName);

      await mkdir(path.dirname(sourceFile), {
        recursive: true,
      });

      await writeFile(sourceFile, source);
    }

    const extensionTestsEnv: Record<string, string> = {
      DEMO_TOOLS_COMPLETION_FILE: completionFile,
      DEMO_TOOLS_EXTENSION_ID: extensionId,
      DEMO_TOOLS_HOST_SETUP: hostSetup ?? "",
      DEMO_TOOLS_SOURCE_FILE: sourceFile ?? "",
      DEMO_TOOLS_HOST_TIMEOUT: String(hostTimeout),
    };

    const args: string[] = [
      env.workspaceDirectory,
      ...(sourceFile ? [sourceFile] : []),
      `--user-data-dir=${env.userDataDirectory}`,
      `--extensions-dir=${extensionsDirectory}`,
      `--remote-debugging-port=${remoteDebuggingPort}`,
      ...launchArgs,
    ];

    testRun = Promise.resolve().then(() =>
      testElectron.runTests({
        vscodeExecutablePath,
        extensionDevelopmentPath: developmentPath,
        extensionTestsPath: extensionHostPath,
        extensionTestsEnv,
        launchArgs: args,
      }),
    );

    // Observe failures while the debugging connection is established.
    void testRun.catch(() => undefined);

    const connection = await connectToVSCode({
      chromium,
      remoteDebuggingPort,
    });

    browser = connection.browser;

    await connection.page.bringToFront?.();
    await connection.page.setViewportSize?.(viewport);

    const runtime: VSCodeDemoRuntime = {
      ...env,
      extensionsDirectory,
      completionFile,
      remoteDebuggingPort,
      sourceFile,
      endpoint: connection.endpoint,
      browser: connection.browser,
      page: connection.page,

      async complete(): Promise<void> {
        await signalCompletion();
        await testRun;
      },

      async dispose(): Promise<void> {
        await cleanup();
      },
    };

    await waitForReady?.(runtime);

    return runtime;
  } catch (error: unknown) {
    await cleanup().catch(() => undefined);
    throw error;
  }
}
