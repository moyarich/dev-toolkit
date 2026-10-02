import { describe, expect, it } from "vitest";
import { looksLikeMarkdown } from "../../src/markdown.ts";

describe("real terminal Markdown examples", () => {
  it("covers the original Node table example", () => {
    const output = [
      "# Tables",
      "",
      "| Project Name | Framework | Language | Status |",
      "| :--- | :---: | :---: | :--- |",
      "| web-editor | React | TypeScript | 🟢 Active |",
      "| terminal-parser | Node.js | JavaScript | 🟡 Paused |",
      "| api-service | Go | Go | 🔴 Archived |",
    ].join("\n");

    expect(looksLikeMarkdown(output)).toBe(true);
  });

  it.each([
    ["TypeScript diagnostic", "src/index.ts:4:8 - error TS2322: Type 'string' is not assignable"],
    ["Go output", "go: downloading example.com/pkg v1.0.0"],
    ["npm log", "npm notice run test"],
    ["git output", "On branch main\nnothing to commit, working tree clean"],
  ])("leaves %s as ordinary output", (_name, output) => {
    expect(looksLikeMarkdown(output)).toBe(false);
  });
});
