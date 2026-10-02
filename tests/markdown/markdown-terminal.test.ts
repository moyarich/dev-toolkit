import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const MARKDOWN_FILES = readdirSync(TEST_DIR)
  .filter((name) => name.endsWith(".md"))
  .sort()
  .map((name) => join(TEST_DIR, name));

const TEMP_DIR = mkdtempSync(join(tmpdir(), "dev-toolkit-markdown-"));

type Producer = {
  name: string;
  command: string;
  args(file: string): string[];
  available(): boolean;
};

/**
 * Returns whether a command can be executed in the current environment.
 */
function commandAvailable(
  command: string,
  versionArgs = ["--version"],
): boolean {
  return (
    spawnSync(command, versionArgs, {
      encoding: "utf8",
      stdio: "ignore",
    }).status === 0
  );
}

/**
 * Creates a temporary TypeScript program that sends Markdown to stdout.
 */
function createTypeScriptProducer(): string {
  const script = join(TEMP_DIR, "print-markdown.ts");
  writeFileSync(
    script,
    [
      'import { readFileSync } from "node:fs";',
      "",
      "const file: string = process.argv[2];",
      'process.stdout.write(readFileSync(file, "utf8"));',
      "",
    ].join("\n"),
  );
  return script;
}

/**
 * Creates a temporary Go program that sends Markdown to stdout.
 */
function createGoProducer(): string {
  const script = join(TEMP_DIR, "print-markdown.go");
  writeFileSync(
    script,
    [
      "package main",
      "",
      "import (",
      '  "fmt"',
      '  "os"',
      ")",
      "",
      "func main() {",
      "  content, err := os.ReadFile(os.Args[1])",
      "  if err != nil {",
      "    panic(err)",
      "  }",
      "  fmt.Print(string(content))",
      "}",
      "",
    ].join("\n"),
  );
  return script;
}

const typescriptProducer = createTypeScriptProducer();
const goProducer = createGoProducer();

const producers: Producer[] = [
  {
    name: "shell subshell",
    command: "sh",
    args: (file) => ["-c", 'cat "$1"', "markdown-test", file],
    available: () => commandAvailable("sh"),
  },
  {
    name: "javascript",
    command: process.execPath,
    args: (file) => [
      "-e",
      'process.stdout.write(require("node:fs").readFileSync(process.argv[1], "utf8"))',
      file,
    ],
    available: () => true,
  },
  {
    name: "typescript",
    command: process.execPath,
    args: (file) => ["--experimental-strip-types", typescriptProducer, file],
    available: () => true,
  },
  {
    name: "python",
    command: "python3",
    args: (file) => [
      "-c",
      'from pathlib import Path; import sys; sys.stdout.write(Path(sys.argv[1]).read_text())',
      file,
    ],
    available: () => commandAvailable("python3"),
  },
  {
    name: "go",
    command: "go",
    args: (file) => ["run", goProducer, file],
    available: () => commandAvailable("go", ["version"]),
  },
];

/**
 * Runs one producer and mirrors its Markdown to this process stdout so terminal
 * Markdown renderers see the exact stream being asserted.
 */
function printMarkdownWith(producer: Producer, file: string): string {
  const output = execFileSync(producer.command, producer.args(file), {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  process.stdout.write(
    `\n<!-- markdown-test: ${producer.name} / ${basename(file)} -->\n`,
  );
  process.stdout.write(output);
  if (!output.endsWith("\n")) process.stdout.write("\n");

  return output;
}

afterAll(() => {
  rmSync(TEMP_DIR, { recursive: true, force: true });
});

describe("terminal Markdown fixtures", () => {
  it("has at least one Markdown fixture", () => {
    expect(MARKDOWN_FILES.length).toBeGreaterThan(0);
  });

  for (const file of MARKDOWN_FILES) {
    const expected = readFileSync(file, "utf8");

    describe(basename(file), () => {
      for (const producer of producers) {
        const run = producer.available() ? it : it.skip;

        run(`prints unchanged Markdown through ${producer.name}`, () => {
          expect(printMarkdownWith(producer, file)).toBe(expected);
        });
      }
    });
  }
});
