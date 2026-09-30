import { defineConfig } from "vite";
import { cliBuild } from "../workspace-tools/vite/cliBuild.ts";

export default defineConfig({
  plugins: [
    cliBuild({
      include: "src/cli/*.ts",
      sourcemap: true,
      external: ["@vscode/test-electron", "playwright-core"],
    }),
  ],
});
