import { resolve } from "node:path";
import { buildCli } from "../workspace-tools/vite/cli.ts";

await buildCli(
  {
    entries: {
      demo: resolve(import.meta.dirname, "src/cli/demo.ts"),
      "demo-strategy": resolve(import.meta.dirname, "src/cli/demo-strategy.ts"),
    },
    sourcemap: true,
    external: ["@vscode/test-electron", "playwright-core"],
  },
  import.meta.dirname,
);
