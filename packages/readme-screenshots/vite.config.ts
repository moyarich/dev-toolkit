import { cli } from "../workspace-tools/vite/cli.ts";

await cli(
  {
    include: "src/cli/*.ts",
    sourcemap: true,
    external: ["playwright"],
  },
  import.meta.dirname,
);
