#!/usr/bin/env node
import { release } from "../src/release.mjs";

try {
  release(process.argv[2]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
