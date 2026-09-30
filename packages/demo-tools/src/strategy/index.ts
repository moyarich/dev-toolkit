import type { DemoStrategy, DemoStrategyContext } from "../types.ts";

export function assertDemoStrategy(value: unknown): asserts value is DemoStrategy {
  if (!value || typeof value !== "object") {
    throw new TypeError("A demo strategy must be an object.");
  }
  const strategy = value as Partial<DemoStrategy>;
  if (!strategy.name || typeof strategy.name !== "string") {
    throw new TypeError("A demo strategy requires a name.");
  }
  if (typeof strategy.run !== "function") {
    throw new TypeError(`Demo strategy "${strategy.name}" requires a run() function.`);
  }
}

export interface RunDemoStrategyOptions<T = unknown> {
  strategy: DemoStrategy<T>;
  moduleUrl?: string;
  artifactsDirectory?: string;
  context?: Partial<DemoStrategyContext>;
}

export async function runDemoStrategy<T>({
  strategy,
  moduleUrl,
  artifactsDirectory,
  context = {},
}: RunDemoStrategyOptions<T>): Promise<T> {
  assertDemoStrategy(strategy);
  const { mkdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const strategyDirectory = moduleUrl ? path.dirname(fileURLToPath(moduleUrl)) : process.cwd();
  const outputDirectory = path.resolve(artifactsDirectory ?? path.join(strategyDirectory, "artifacts"));
  await mkdir(outputDirectory, { recursive: true });
  return strategy.run({ ...context, id: strategy.name, strategyDirectory, artifactsDirectory: outputDirectory, moduleUrl });
}
