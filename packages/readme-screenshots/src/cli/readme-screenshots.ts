import { Command } from "commander";
import { captureScreenshots } from "../capture.ts";

const program = new Command();

program
  .name("readme-screenshots")
  .description("Generate README screenshots from a Playwright screenshot configuration.")
  .argument(
    "[config]",
    "Path to the screenshot configuration",
    "readme-screenshots.config.mjs",
  )
  .action(async (config: string) => {
    await captureScreenshots(config);
  });

await program.parseAsync();
