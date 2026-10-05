import readline from "node:readline";

import chalk from "chalk";

import {
  formatBytes,
  listHistoricalChildren,
  normalizeRemovalPaths,
  selectionState,
  type HistoricalDirectoryNode,
  type HistoricalNode,
} from "./index.ts";

export interface BrowseResult {
  action: "quit" | "rewrite";
  paths: string[];
}

interface BrowserState {
  current: HistoricalDirectoryNode;
  parents: HistoricalDirectoryNode[];
  cursor: number;
  selected: Set<string>;
  query: string;
  searchMode: boolean;
}

export async function browseHistoricalTree(
  start: HistoricalDirectoryNode,
): Promise<BrowseResult> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Interactive browsing requires a TTY.");
  }

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  const state: BrowserState = {
    current: start,
    parents: [],
    cursor: 0,
    selected: new Set(),
    query: "",
    searchMode: false,
  };

  render(state);

  try {
    return await new Promise<BrowseResult>((resolve) => {
      const onKeypress = (input: string, key: readline.Key) => {
        const entries = listHistoricalChildren(state.current, state.query);
        const current = entries[state.cursor];

        if (state.searchMode) {
          if (key.name === "escape") {
            state.searchMode = false;
            state.query = "";
            state.cursor = 0;
          } else if (key.name === "return") {
            state.searchMode = false;
          } else if (key.name === "backspace") {
            state.query = state.query.slice(0, -1);
            state.cursor = 0;
          } else if (!key.ctrl && !key.meta && input && input.length === 1) {
            state.query += input;
            state.cursor = 0;
          }

          render(state);
          return;
        }

        if (key.ctrl && key.name === "c") {
          cleanup();
          resolve({ action: "quit", paths: normalizeRemovalPaths(state.selected) });
          return;
        }

        switch (key.name) {
          case "up":
            state.cursor = Math.max(0, state.cursor - 1);
            break;
          case "down":
            state.cursor = Math.min(
              Math.max(entries.length - 1, 0),
              state.cursor + 1,
            );
            break;
          case "return":
          case "right":
            if (current?.type === "directory") {
              state.parents.push(state.current);
              state.current = current;
              state.cursor = 0;
              state.query = "";
            }
            break;
          case "left":
          case "backspace":
            if (state.parents.length > 0) {
              state.current = state.parents.pop()!;
              state.cursor = 0;
              state.query = "";
            }
            break;
          case "space":
            if (current) toggleSelected(state.selected, current);
            break;
          case "escape":
          case "q":
            cleanup();
            resolve({ action: "quit", paths: normalizeRemovalPaths(state.selected) });
            return;
          default:
            if (input === "/") {
              state.searchMode = true;
              state.query = "";
              state.cursor = 0;
            } else if (input === "a") {
              for (const entry of entries) state.selected.add(entry.path);
            } else if (input === "A") {
              for (const entry of entries) state.selected.delete(entry.path);
            } else if (input === "c") {
              state.selected.clear();
            } else if (input === "x") {
              cleanup();
              resolve({
                action: "rewrite",
                paths: normalizeRemovalPaths(state.selected),
              });
              return;
            }
        }

        render(state);
      };

      const cleanup = () => {
        process.stdin.off("keypress", onKeypress);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\x1b[?25h\x1b[2J\x1b[H");
      };

      process.stdin.on("keypress", onKeypress);
    });
  } finally {
    if (process.stdin.isTTY && process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }
    process.stdout.write("\x1b[?25h");
  }
}

function toggleSelected(
  selected: Set<string>,
  node: HistoricalNode,
): void {
  if (selected.has(node.path)) {
    selected.delete(node.path);
  } else {
    selected.add(node.path);
  }
}

function render(state: BrowserState): void {
  const entries = listHistoricalChildren(state.current, state.query);
  if (state.cursor >= entries.length) {
    state.cursor = Math.max(entries.length - 1, 0);
  }

  const height = Math.max(process.stdout.rows ?? 24, 12);
  const availableRows = Math.max(height - 10, 3);
  const start = Math.max(
    0,
    Math.min(
      state.cursor - Math.floor(availableRows / 2),
      Math.max(entries.length - availableRows, 0),
    ),
  );
  const visible = entries.slice(start, start + availableRows);

  process.stdout.write("\x1b[?25l\x1b[2J\x1b[H");
  console.log(chalk.bold("Git historical filesystem"));
  console.log(chalk.dim("Path: ") + "/" + state.current.path);
  console.log(
    chalk.dim(
      "Historical    Largest blob    Blobs   Path",
    ),
  );
  console.log(chalk.dim("─".repeat(Math.min(process.stdout.columns ?? 80, 100))));

  if (!visible.length) {
    console.log(chalk.dim("  No matching historical paths."));
  }

  visible.forEach((entry, visibleIndex) => {
    const absoluteIndex = start + visibleIndex;
    const cursor = absoluteIndex === state.cursor;
    const status = selectionState(entry.path, state.selected);
    const mark =
      status === "selected" ? "[x]" : status === "covered" ? "[·]" : "[ ]";
    const type = entry.type === "directory" ? "▸" : " ";
    const line =
      (cursor ? "❯ " : "  ") +
      mark +
      " " +
      formatBytes(entry.size).padStart(11) +
      "  " +
      formatBytes(entry.largestBlob).padStart(12) +
      "  " +
      String(entry.blobCount).padStart(7) +
      "   " +
      type +
      " " +
      entry.name +
      (entry.type === "directory" ? "/" : "");

    console.log(
      cursor
        ? chalk.inverse(line)
        : status === "selected"
          ? chalk.cyan(line)
          : status === "covered"
            ? chalk.dim(line)
            : line,
    );
  });

  console.log();
  const selected = normalizeRemovalPaths(state.selected);
  console.log(
    chalk.bold("Selected: ") +
      (selected.length ? selected.length + " path(s)" : "none"),
  );

  if (state.searchMode) {
    console.log(chalk.cyan("Filter: /" + state.query));
  } else if (state.query) {
    console.log(chalk.dim("Filter: /" + state.query));
  } else {
    console.log(chalk.dim("Filter: none"));
  }

  console.log(
    chalk.dim(
      "↑↓ navigate  Enter/→ open  ← back  Space select  / filter  a all  A none  c clear  x rewrite  q quit",
    ),
  );
}
