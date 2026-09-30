import { cli } from "../workspace-tools/vite/cli.ts";

await cli(
  {
    include: "src/cli/*.ts",
    sourcemap: true,
    external: ["@vscode/test-electron", "playwright-core"],
  },
  import.meta.dirname,
);
