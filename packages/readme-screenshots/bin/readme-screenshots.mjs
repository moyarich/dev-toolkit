#!/usr/bin/env node
import { captureScreenshots } from "../src/capture.mjs";

try {
  await captureScreenshots(process.argv[2] || process.env.README_SCREENSHOT_CONFIG || "readme-screenshots.config.mjs");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
