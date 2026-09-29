#!/usr/bin/env node
import { program } from 'commander';
import { captureScreenshots } from "../src/capture.mjs";

program
  .name("readme-screenshots")
  .description("Capture README screenshots using a Playwright configuration.")
  .argument("[config]", "Screenshot configuration file");

try {
  program.parse();
  await captureScreenshots(program.args[0] || process.env.README_SCREENSHOT_CONFIG);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
