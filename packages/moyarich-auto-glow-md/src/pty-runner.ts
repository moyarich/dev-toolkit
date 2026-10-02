import { spawn } from "node:child_process";
import process from "node:process";
import * as pty from "node-pty";
import { looksLikeMarkdown, stripAnsi } from "./markdown.ts";

export interface RunTerminalCommandOptions {
  command: string;
  flushDelayMs?: number;
}

/**
 * Executes a command in a PTY, preserving terminal behavior while classifying
 * terminal-facing output for optional Markdown rendering through Glow.
 */
export async function runTerminalCommand({
  command,
  flushDelayMs = 40,
}: RunTerminalCommandOptions): Promise<number> {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const env = {
    ...process.env,
    MOYARICH_AUTO_GLOW_CHILD: "1",
    TERM: process.env.TERM || "xterm-256color",
  };

  const child = pty.spawn(process.env.SHELL || "/bin/zsh", ["-c", command], {
    name: env.TERM,
    cols,
    rows,
    cwd: process.cwd(),
    env,
  });

  let buffer = "";
  let timer: NodeJS.Timeout | undefined;

  const renderMarkdown = (markdown: string): void => {
    const glow = spawn("glow", ["-"], {
      stdio: ["pipe", "inherit", "inherit"],
      env: process.env,
    });
    glow.stdin.end(markdown);
  };

  const flush = (): void => {
    if (!buffer) return;

    const content = buffer;
    buffer = "";

    if (looksLikeMarkdown(content)) {
      renderMarkdown(stripAnsi(content));
    } else {
      process.stdout.write(content);
    }
  };

  child.onData((data) => {
    buffer += data;

    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, flushDelayMs);
  });

  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", (data) => child.write(data.toString()));

  process.stdout.on("resize", () => {
    child.resize(process.stdout.columns || 80, process.stdout.rows || 24);
  });

  return await new Promise<number>((resolve) => {
    child.onExit(({ exitCode }) => {
      if (timer) clearTimeout(timer);
      flush();

      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      resolve(exitCode);
    });
  });
}
