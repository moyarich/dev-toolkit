# @moyarich/vite-plugin-package-bin

Vite plugin for building `package.json#bin` entries as independent Node.js executables without shared runtime chunks.

```ts
import { defineConfig } from "vite";
import { packageBinBuild } from "@moyarich/vite-plugin-package-bin";

export default defineConfig({
  plugins: [
    packageBinBuild({
      include: "src/cli/*.ts",
    }),
  ],
});
```
