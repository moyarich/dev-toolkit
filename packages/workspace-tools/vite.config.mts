import { resolve } from "node:path";
import { defineConfig } from "vite";

import { cli } from "./vite/index.mts";

export default defineConfig({
  plugins: [
    cli({
      entries: {
        "workspace-release": resolve(import.meta.dirname, "src/cli/workspace-release.mts"),
        "workspace-publish": resolve(import.meta.dirname, "src/cli/workspace-publish.mts"),
        "workspace-dependency-check": resolve(
          import.meta.dirname,
          "src/cli/workspace-dependency-check.mts",
        ),
        "discover-test-packages": resolve(
          import.meta.dirname,
          "src/cli/discover-test-packages.mts",
        ),
      },
    }),
  ],
});
