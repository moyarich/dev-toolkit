import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createVSCodeEnvironment } from "./environment.ts";
import { connectToVSCode } from "./devtools.ts";
import { freePort, runProcess } from "../utils/index.ts";
import type { BrowserPage, Chromium } from "../types.ts";

const extensionHostPath = fileURLToPath(new URL("./extension-host.cjs", import.meta.url));
export interface BuildCommand { command: string; args?: string[] }
export interface TestElectron {
  downloadAndUnzipVSCode(options: { version: string; cachePath: string }): Promise<string>;
  runTests(options: Record<string, unknown>): Promise<unknown>;
}
interface EnsureExtensionOptions { developmentPath: string; build?: string | BuildCommand; cwd: string }

async function ensureExtension({ developmentPath, build, cwd }: EnsureExtensionOptions): Promise<void> {
  try { await access(path.join(developmentPath, "package.json")); return; } catch { /* Build the extension below when package.json is not available yet. */ }
  if (!build) throw new Error(`VS Code extension is not built: ${developmentPath}`);
  const command = typeof build === "string" ? { command: "npm", args: ["run", build] } : build;
  await runProcess(command.command, command.args ?? [], { cwd });
  await access(path.join(developmentPath, "package.json"));
}

export async function prepareVSCodeExecutable({
  testElectron, developmentPath, build, projectDirectory = process.cwd(),
  version = process.env.VSCODE_VERSION ?? "stable", cachePath = path.resolve(projectDirectory, ".vscode-test"),
}: { testElectron: TestElectron; developmentPath: string; build?: string | BuildCommand; projectDirectory?: string; version?: string; cachePath?: string }): Promise<string> {
  if (!testElectron?.downloadAndUnzipVSCode) throw new TypeError("prepareVSCodeExecutable requires @vscode/test-electron.");
  await ensureExtension({ developmentPath, build, cwd: projectDirectory });
  return testElectron.downloadAndUnzipVSCode({ version, cachePath });
}

export interface VSCodeDemoRuntime {
  temporaryDirectory: string; userDataDirectory: string; workspaceDirectory: string;
  extensionsDirectory: string; completionFile: string; remoteDebuggingPort: number;
  sourceFile?: string; endpoint: string; browser: { close(): Promise<void> }; page: BrowserPage;
  complete(): Promise<void>; dispose(): Promise<void>;
}
export interface CreateVSCodeDemoRuntimeOptions {
  testElectron: TestElectron; chromium: Chromium; extensionId: string; developmentPath: string;
  vscodeExecutablePath: string; settings?: Record<string, unknown>; launchArgs?: string[];
  viewport?: { width: number; height: number }; source?: string; sourceFileName?: string;
  hostSetup?: string; hostTimeout?: number; waitForReady?: (runtime: VSCodeDemoRuntime) => void | Promise<void>;
}

export async function createVSCodeDemoRuntime({
  testElectron, chromium, extensionId, developmentPath, vscodeExecutablePath, settings = {}, launchArgs = [],
  viewport = { width: 1280, height: 900 }, source, sourceFileName = "demo.txt", hostSetup, hostTimeout = 120000, waitForReady,
}: CreateVSCodeDemoRuntimeOptions): Promise<VSCodeDemoRuntime> {
  if (!testElectron?.runTests) throw new TypeError("createVSCodeDemoRuntime requires @vscode/test-electron.");
  if (!extensionId) throw new TypeError("createVSCodeDemoRuntime requires extensionId.");
  if (!developmentPath) throw new TypeError("createVSCodeDemoRuntime requires developmentPath.");
  const env = await createVSCodeEnvironment({ settings, prefix: "vscode-demo-" });
  const extensionsDirectory = path.join(env.temporaryDirectory, "extensions");
  const completionFile = path.join(env.temporaryDirectory, "done");
  const remoteDebuggingPort = await freePort();
  await mkdir(extensionsDirectory, { recursive: true });
  let sourceFile: string | undefined;
  if (source !== undefined) { sourceFile = path.join(env.workspaceDirectory, sourceFileName); await mkdir(path.dirname(sourceFile), { recursive: true }); await writeFile(sourceFile, source); }
  let browser: { close(): Promise<void> } | undefined;
  let testRun: Promise<unknown> | undefined;
  try {
    testRun = testElectron.runTests({
      vscodeExecutablePath, extensionDevelopmentPath: developmentPath, extensionTestsPath: extensionHostPath,
      extensionTestsEnv: { DEMO_TOOLS_COMPLETION_FILE: completionFile, DEMO_TOOLS_EXTENSION_ID: extensionId, DEMO_TOOLS_HOST_SETUP: hostSetup ?? "", DEMO_TOOLS_SOURCE_FILE: sourceFile ?? "", DEMO_TOOLS_HOST_TIMEOUT: String(hostTimeout) },
      launchArgs: [env.workspaceDirectory, ...(sourceFile ? [sourceFile] : []), `--user-data-dir=${env.userDataDirectory}`, `--extensions-dir=${extensionsDirectory}`, `--remote-debugging-port=${remoteDebuggingPort}`, ...launchArgs],
    });
    const connection = await connectToVSCode({ chromium, remoteDebuggingPort });
    browser = connection.browser;
    await connection.page.bringToFront?.();
    await connection.page.setViewportSize?.(viewport);
    const runtime: VSCodeDemoRuntime = {
      ...env, extensionsDirectory, completionFile, remoteDebuggingPort, sourceFile, endpoint: connection.endpoint, browser, page: connection.page,
      async complete() { await writeFile(completionFile, "done"); await testRun; },
      async dispose() { await writeFile(completionFile, "done").catch(() => undefined); await testRun?.catch(() => undefined); await browser?.close().catch(() => undefined); await rm(env.temporaryDirectory, { recursive: true, force: true }); },
    };
    await waitForReady?.(runtime);
    return runtime;
  } catch (error: unknown) {
    await writeFile(completionFile, "done").catch(() => undefined);
    await testRun?.catch(() => undefined);
    await browser?.close().catch(() => undefined);
    await rm(env.temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}
