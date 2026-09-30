import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { DemoStrategy, DemoStrategyEntry } from "../types.ts";

interface StrategyModulePath { modulePath: string; relativePath: string }

async function findStrategyModules(directory: string, root = directory): Promise<StrategyModulePath[]> {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  const modules: StrategyModulePath[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "artifacts") continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) modules.push(...await findStrategyModules(target, root));
    else if (entry.isFile() && (entry.name === "index.mjs" || entry.name.endsWith(".strategy.mjs"))) {
      modules.push({ modulePath: target, relativePath: path.relative(root, target) });
    }
  }
  return modules;
}

export async function discoverDemoStrategies(
  { directory = path.resolve("demo/strategies") }: { directory?: string } = {},
): Promise<DemoStrategyEntry[]> {
  const root = path.resolve(directory);
  const modules = await findStrategyModules(root);
  const strategies: DemoStrategyEntry[] = [];
  for (const entry of modules) {
    const loaded = await import(pathToFileURL(entry.modulePath).href) as { default?: DemoStrategy; strategy?: DemoStrategy };
    const strategy = loaded.default ?? loaded.strategy;
    if (!strategy?.name || typeof strategy.run !== "function") continue;
    strategies.push({ id: strategy.name, description: strategy.description ?? "", directory: path.dirname(entry.modulePath), modulePath: entry.modulePath, relativePath: entry.relativePath, strategy });
  }
  const ids = new Set<string>();
  for (const entry of strategies) {
    if (ids.has(entry.id)) throw new Error(`Duplicate demo strategy name: ${entry.id}`);
    ids.add(entry.id);
  }
  return strategies.sort((a, b) => a.id.localeCompare(b.id));
}
