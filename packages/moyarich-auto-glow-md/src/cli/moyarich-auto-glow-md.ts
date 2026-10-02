#!/usr/bin/env node
import process from "node:process";
import { runTerminalCommand } from "../pty-runner.ts";

const separator = process.argv.indexOf("--");
const command =
  separator >= 0
    ? process.argv.slice(separator + 1).join(" ")
    : process.argv.slice(2).join(" ");

if (!command) {
  console.error("Usage: moyarich-auto-glow-md -- <command>");
  process.exit(2);
}

process.exitCode = await runTerminalCommand({ command });
