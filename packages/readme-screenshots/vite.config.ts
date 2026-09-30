import { resolve } from "node:path";
import { buildCli } from "../workspace-tools/vite/cli.ts";

await buildCli(
  {
    entries: {
      "readme-screenshots": resolve(import.meta.dirname, "src/cli/readme-screenshots.ts"),
    },
    sourcemap: true,
    external: ["playwright"],
  },
  import.meta.dirname,
);
