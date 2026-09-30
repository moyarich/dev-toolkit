import { execFile } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

interface TestPackage {
  directory: string;
  name: string;
}

export async function discoverTestPackages(
  root = "packages",
): Promise<TestPackage[]> {
  const directory = await realpath(root);
  if (
    directory
      .split(path.sep)
      .some((part) => part === "node_modules" || part === ".git")
  ) {
    return [];
  }

  // Ask Git for direct-child manifests; never walk installed dependencies.
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "--cached", "-z", "--", ":(glob)*/package.json"],
    { cwd: directory, encoding: "utf8" },
  );
  const packages: TestPackage[] = [];

  for (const file of new Set(stdout.split("\0").filter(Boolean))) {
    const parts = file.split("/");
    if (
      parts.length !== 2 ||
      parts[0] === "node_modules" ||
      parts[0] === ".git"
    )
      continue;
    const name = parts[0];
    const packageFile = path.join(root, name, "package.json");

    try {
      if (!(await lstat(packageFile)).isFile()) continue;
      const manifest = JSON.parse(await readFile(packageFile, "utf8"));

      if (manifest.scripts?.test) {
        packages.push({
          directory: path.join(root, name),
          name: manifest.name ?? name,
        });
      }
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    }
  }

  return packages.sort((a, b) => a.name.localeCompare(b.name));
}
