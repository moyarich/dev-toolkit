import { resolve } from "node:path";
import { defineConfig } from "vite";

import { cli } from "./vite/index.ts";

export default defineConfig({
  plugins: [
    cli({
      entries: {
        "workspace-release": resolve(import.meta.dirname, "src/cli/workspace-release.ts"),
        "workspace-publish": resolve(import.meta.dirname, "src/cli/workspace-publish.ts"),
        "workspace-package-lock": resolve(import.meta.dirname, "src/cli/workspace-package-lock.ts"),
        "workspace-dependency-check": resolve(
          import.meta.dirname,
          "src/cli/workspace-dependency-check.ts",
        ),
        "discover-test-packages": resolve(
          import.meta.dirname,
          "src/cli/discover-test-packages.ts",
        ),
      },
    }),
  ],
});
