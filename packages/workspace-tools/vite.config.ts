import { defineConfig } from "vite";
import { cliBuild } from "./vite/cliBuild.ts";

export default defineConfig({
  plugins: [
    cliBuild({
      include: "src/cli/*.ts",
    }),
  ],
});
