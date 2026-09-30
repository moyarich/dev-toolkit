import { cliBuild } from "../workspace-tools/vite/cliBuild.ts";

await cliBuild(
  {
    include: "src/cli/*.ts",
    sourcemap: true,
    external: ["playwright"],
  },
  import.meta.dirname,
);
