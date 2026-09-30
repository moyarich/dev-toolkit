import { cli } from "./vite/cli.ts";

await cli(
  {
    include: "src/cli/*.ts",
  },
  import.meta.dirname,
);
