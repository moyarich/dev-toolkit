import { resolve } from "node:path";
import { buildCli } from "../workspace-tools/vite/cli.ts";

await buildCli(
  {
    entries: {
      "vs-code-publish": resolve(import.meta.dirname, "src/cli/vs-code-publish.ts"),
      "run-extension-dev": resolve(import.meta.dirname, "src/cli/run-extension-dev.ts"),
    },
    sourcemap: true,
    external: [/^@inquirer\//, "chalk", "commander"],
  },
  import.meta.dirname,
);
