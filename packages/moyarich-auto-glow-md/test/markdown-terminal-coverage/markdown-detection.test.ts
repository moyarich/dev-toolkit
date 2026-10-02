import { describe, expect, it } from "vitest";
import { looksLikeMarkdown, stripAnsi } from "../../src/markdown.ts";

describe("markdown terminal coverage", () => {
  it("detects ATX headings", () => {
    expect(looksLikeMarkdown("# Hello")).toBe(true);
    expect(looksLikeMarkdown("## Build results")).toBe(true);
  });

  it("detects fenced code blocks", () => {
    expect(
      looksLikeMarkdown([
        "before",
        String.fromCharCode(96).repeat(3) + "ts",
        "const x = 1;",
        String.fromCharCode(96).repeat(3),
      ].join("\n")),
    ).toBe(true);
  });

  it("detects Markdown tables", () => {
    expect(
      looksLikeMarkdown(
        "| Name | Status |\n| --- | --- |\n| api | active |",
      ),
    ).toBe(true);
  });

  it("does not classify ordinary pipe output as Markdown", () => {
    expect(looksLikeMarkdown("foo | bar | baz")).toBe(false);
  });

  it("does not classify logs with hashes as Markdown", () => {
    expect(looksLikeMarkdown("build #123 completed")).toBe(false);
  });

  it("strips ANSI sequences before detection", () => {
    expect(stripAnsi("\u001b[32m# Hello\u001b[0m")).toBe("# Hello");
    expect(looksLikeMarkdown("\u001b[32m# Hello\u001b[0m")).toBe(true);
  });
});
