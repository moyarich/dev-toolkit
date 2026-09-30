import { cliBuild } from "./vite/cliBuild.ts";

await cliBuild(
  {
    include: "src/cli/*.ts",
  },
  import.meta.dirname,
);
