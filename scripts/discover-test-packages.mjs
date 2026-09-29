import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { program } from 'commander';

program
  .name("discover-test-packages")
  .description("List workspace packages that define a test script.")
  .argument("[directory]", "Packages directory", "packages")
  .parse();

const [root] = program.processedArgs;
const entries = await readdir(root, { withFileTypes: true });
const packages = [];
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const packageFile = path.join(root, entry.name, "package.json");
  try {
    const manifest = JSON.parse(await readFile(packageFile, "utf8"));
    if (manifest.scripts?.test) packages.push({ directory: path.join(root, entry.name), name: manifest.name ?? entry.name });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
packages.sort((a, b) => a.name.localeCompare(b.name));
process.stdout.write(JSON.stringify(packages));
