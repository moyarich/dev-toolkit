import { Command } from "commander";
import {
  discoverDemoStrategies,
  runDemoStrategies,
  selectDemoStrategies,
} from "../index.ts";
import { captureDemoStrategy } from "../generate/index.ts";
import { launchBrowserDemo } from "../browser/index.ts";
import { encodeGif } from "../capture/index.ts";

const program = new Command();

program
  .name("demo")
  .description("Discover, select, and run self-contained demo strategies.")
  .version("0.0.0")
  .option("-d, --strategies <directory>", "strategy root directory", "demo/strategies")
  .option("-a, --artifacts <directory>", "override the artifacts output directory")
  .showHelpAfterError();

program
  .command("list")
  .description("List discovered demo strategies.")
  .option("--json", "print discovered strategies as JSON")
  .action(async (options: { json?: boolean }) => {
    const root = program.opts<{ strategies: string }>();
    const strategies = await discoverDemoStrategies({ directory: root.strategies });
    if (options.json) {
      console.log(
        JSON.stringify(
          strategies.map(({ id, description, relativePath, modulePath }) => ({
            id,
            description,
            relativePath,
            modulePath,
          })),
          null,
          2,
        ),
      );
      return;
    }
    for (const { id, description, relativePath } of strategies) {
      console.log([id, description, relativePath].filter(Boolean).join("\t"));
    }
  });

program
  .command("run")
  .description("Run discovered demo strategies.")
  .argument("[strategies...]", "strategy names; omit to run all")
  .option("-s, --strategy <name...>", "strategy names (repeat or provide multiple)")
  .action(async (arguments_: string[], options: { strategy?: string[] }) => {
    const root = program.opts<{ strategies: string; artifacts?: string }>();
    const selected = [...(arguments_ ?? []), ...(options.strategy ?? [])];
    await runDemoStrategies({
      directory: root.strategies,
      selected: selected.length ? selected : "all",
      ...(root.artifacts ? { artifactsDirectory: root.artifacts } : {}),
    });
  });

program
  .command("select", { isDefault: Boolean(process.stdin.isTTY && process.stdout.isTTY) })
  .alias("interactive")
  .description("Select one or more discovered strategies with fzf.")
  .action(async () => {
    const root = program.opts<{ strategies: string; artifacts?: string }>();
    const selected = await selectDemoStrategies({ directory: root.strategies });
    if (!selected.length) return;
    await runDemoStrategies({
      directory: root.strategies,
      selected,
      ...(root.artifacts ? { artifactsDirectory: root.artifacts } : {}),
    });
  });

program
  .command("create")
  .description("Record Playwright actions and write a directly executable strategy.")
  .argument("[name]", "strategy name")
  .option("-u, --url <url>", "page URL to record")
  .action(async (name: string | undefined, options: { url?: string }) => {
    if (!name) throw new Error("demo create requires a strategy name.");
    if (!options.url) throw new Error("demo create requires --url <url>.");
    const { chromium } = await import("playwright-core");
    const demo = await launchBrowserDemo({
      chromium,
      url: options.url,
      launchOptions: { headless: false },
    });
    try {
      const strategyFile = await captureDemoStrategy({ page: demo.page, name });
      console.log(strategyFile);
    } finally {
      await demo.close();
    }
  });

program
  .command("gif")
  .description("Encode an existing demo WebM as a GIF.")
  .argument("<input>", "input WebM path")
  .argument("[output]", "output GIF path")
  .option("--fps <number>", "GIF frames per second", Number, 12)
  .option("--width <number>", "maximum GIF width", Number, 960)
  .option("--trim-start <seconds>", "seconds to trim from the start", Number, 0)
  .action(
    async (
      input: string,
      output: string | undefined,
      options: { fps: number; width: number; trimStart: number },
    ) => {
      const destination = output ?? input.replace(/\.webm$/i, ".gif");
      await encodeGif({
        input,
        output: destination,
        fps: options.fps,
        width: options.width,
        trimStart: options.trimStart,
      });
      console.log(destination);
    },
  );

if (process.argv.length === 2 && !(process.stdin.isTTY && process.stdout.isTTY)) {
  process.argv.push("run");
}

await program.parseAsync(process.argv);
