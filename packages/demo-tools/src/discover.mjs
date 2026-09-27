import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function discoverDemoStrategies({
  directory = path.resolve("demo/strategies"),
} = {}) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const strategies = [];
  for (const entry of entries.filter((value) => value.isDirectory())) {
    const modulePath = path.join(directory, entry.name, "index.mjs");
    try {
      const module = await import(pathToFileURL(modulePath));
      const strategy = module.default ?? module.strategy;
      if (!strategy) continue;
      strategies.push({
        id: entry.name,
        directory: path.join(directory, entry.name),
        modulePath,
        strategy,
      });
    } catch (error) {
      if (error?.code === "ERR_MODULE_NOT_FOUND" && error?.url === pathToFileURL(modulePath).href) {
        continue;
      }
      throw error;
    }
  }

  return strategies.sort((a, b) => a.id.localeCompare(b.id));
}
