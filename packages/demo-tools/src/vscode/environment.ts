import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface VSCodeEnvironment {
  temporaryDirectory: string;
  userDataDirectory: string;
  workspaceDirectory: string;
}
function temporaryBaseDirectory(): string {
  return process.platform === "darwin" ? "/tmp" : os.tmpdir();
}

export async function createVSCodeEnvironment({
  settings = {},
  prefix = "demo-",
}: { settings?: Record<string, unknown>; prefix?: string } = {}): Promise<VSCodeEnvironment> {
  const temporaryDirectory = await mkdtemp(path.join(temporaryBaseDirectory(), prefix));
  const userDataDirectory = path.join(temporaryDirectory, "u");
  const workspaceDirectory = path.join(temporaryDirectory, "w");
  const userSettingsDirectory = path.join(userDataDirectory, "User");
  const workspaceSettingsDirectory = path.join(workspaceDirectory, ".vscode");
  await Promise.all([
    mkdir(userSettingsDirectory, { recursive: true }),
    mkdir(workspaceSettingsDirectory, { recursive: true }),
  ]);
  const json = `${JSON.stringify(settings, null, 2)}\n`;
  await Promise.all([
    writeFile(path.join(userSettingsDirectory, "settings.json"), json, "utf8"),
    writeFile(path.join(workspaceSettingsDirectory, "settings.json"), json, "utf8"),
  ]);
  return { temporaryDirectory, userDataDirectory, workspaceDirectory };
}
