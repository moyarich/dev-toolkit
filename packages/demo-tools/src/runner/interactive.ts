import { spawnSync } from "node:child_process";
import { discoverDemoStrategies } from "./discover.ts";

export interface FzfOptions { prompt?: string; multi?: boolean; header?: string }

export function selectWithFzf(lines: string[], {
  prompt = "Strategies › ",
  multi = true,
  header = "Tab: toggle  Ctrl+A: select all  Enter: run  Esc: cancel",
}: FzfOptions = {}): string[] {
  const args = [...(multi ? ["--multi"] : []), "--height=80%", "--layout=reverse", "--border", "--info=inline-right", "--marker=✓ ", "--pointer=▶", `--prompt=${prompt}`, `--header=${header}`, ...(multi ? ["--bind=ctrl-a:select-all,ctrl-d:deselect-all"] : [])];
  const result = spawnSync("fzf", args, { input: `${lines.join("\n")}\n`, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });
  if (result.error && "code" in result.error && result.error.code === "ENOENT") throw new Error("Interactive demo selection requires fzf. Use `demo list` or `demo run --strategy=<name>` without it.");
  if (result.status !== 0) return [];
  return result.stdout.trim().split("\n").filter(Boolean);
}

export async function selectDemoStrategies({ directory, includeAll = true }: { directory?: string; includeAll?: boolean } = {}): Promise<string[]> {
  const strategies = await discoverDemoStrategies({ directory });
  const byLine = new Map<string, string>();
  const lines = strategies.map((entry) => {
    const line = entry.description ? `${entry.id}\t${entry.description}` : entry.id;
    byLine.set(line, entry.id);
    return line;
  });
  if (includeAll) { lines.unshift("all\tRun every discovered strategy"); byLine.set("all\tRun every discovered strategy", "all"); }
  const ids = selectWithFzf(lines).map((line) => byLine.get(line)).filter((id): id is string => Boolean(id));
  return ids.includes("all") ? strategies.map(({ id }) => id) : ids;
}
