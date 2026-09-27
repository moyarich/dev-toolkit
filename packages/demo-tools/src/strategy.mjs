import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function defineDemoStrategy(strategy) {
  if (!strategy || typeof strategy !== "object") throw new TypeError("A demo strategy must be an object.");
  if (!strategy.name || typeof strategy.name !== "string") throw new TypeError("A demo strategy requires a name.");
  if (typeof strategy.run !== "function") throw new TypeError(`Demo strategy "${strategy.name}" requires a run() function.`);
  return Object.freeze({ tags: [], ...strategy, tags: Object.freeze([...(strategy.tags ?? [])]) });
}

export function isMainModule(moduleUrl) {
  if (!moduleUrl || !process.argv[1]) return false;
  return fileURLToPath(moduleUrl) === path.resolve(process.argv[1]);
}

export async function runDemoStrategy({
  strategy,
  moduleUrl,
  artifactsDirectory,
  context = {},
} = {}) {
  if (!strategy) throw new TypeError("runDemoStrategy requires a strategy.");
  const strategyDirectory = moduleUrl ? path.dirname(fileURLToPath(moduleUrl)) : process.cwd();
  const outputDirectory = path.resolve(
    artifactsDirectory ?? path.join(strategyDirectory, "artifacts"),
  );
  await mkdir(outputDirectory, { recursive: true });
  return strategy.run({
    ...context,
    id: strategy.name,
    strategyDirectory,
    artifactsDirectory: outputDirectory,
    moduleUrl,
  });
}

export async function runDemoStrategyModule({
  strategy,
  moduleUrl,
  artifactsDirectory,
  context,
} = {}) {
  if (!isMainModule(moduleUrl)) return false;
  await runDemoStrategy({ strategy, moduleUrl, artifactsDirectory, context });
  return true;
}

export function executableDemoStrategy(strategy, moduleUrl, options = {}) {
  const defined = defineDemoStrategy(strategy);
  void runDemoStrategyModule({ strategy: defined, moduleUrl, ...options }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  return defined;
}
