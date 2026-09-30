import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

interface TestPackage {
  directory: string;
  name: string;
}

export async function discoverTestPackages(
  root = "packages",
): Promise<TestPackage[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const packages: TestPackage[] = [];

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
