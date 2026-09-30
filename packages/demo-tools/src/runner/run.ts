import path from "node:path";
import { mkdir } from "node:fs/promises";
import { discoverDemoStrategies } from "./discover.ts";
import type { DemoStrategyContext } from "../types.ts";

export interface RunDemoStrategiesOptions {
  directory?: string;
  selected?: "all" | string | string[];
  artifactsDirectory?: string;
  context?: Partial<DemoStrategyContext>;
}

export interface DemoRunResult { id: string; result: unknown }

export async function runDemoStrategies({
  directory = path.resolve("demo/strategies"),
  selected = "all",
  artifactsDirectory = path.resolve("demo/artifacts"),
  context = {},
}: RunDemoStrategiesOptions = {}): Promise<DemoRunResult[]> {
  const discovered = await discoverDemoStrategies({ directory });
  const names = selected === "all" ? undefined : new Set(Array.isArray(selected) ? selected : String(selected).split(",").map((value) => value.trim()).filter(Boolean));
  const strategies = names ? discovered.filter(({ id }) => names.has(id)) : discovered;
  if (names) {
    const found = new Set(strategies.map(({ id }) => id));
    const missing = [...names].filter((name) => !found.has(name));
    if (missing.length) throw new Error(`Unknown demo strategies: ${missing.join(", ")}`);
  }
  await mkdir(artifactsDirectory, { recursive: true });
  const results: DemoRunResult[] = [];
  for (const entry of strategies) {
    const strategyArtifactsDirectory = path.join(artifactsDirectory, entry.id);
    await mkdir(strategyArtifactsDirectory, { recursive: true });
    const strategyContext: DemoStrategyContext = { ...context, id: entry.id, strategyDirectory: entry.directory, artifactsDirectory: strategyArtifactsDirectory };
    results.push({ id: entry.id, result: await entry.strategy.run(strategyContext) });
  }
  return results;
}
