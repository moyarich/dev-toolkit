# @moyarich/vite-plugin-package-bin

Vite plugin for building `package.json#bin` entries as independent Node.js executables without shared runtime chunks.

For the common case, source discovery defaults to `src/**/*.ts`:

```ts
import { defineConfig } from "vite";
import { packageBinBuild } from "@moyarich/vite-plugin-package-bin";

export default defineConfig({
  plugins: [
    packageBinBuild({
      emptyOutDir: true,
    }),
  ],
});
```

Use an explicit entry pattern when executable files live in a dedicated directory or when library and CLI files share a basename:

```ts
packageBinBuild({
  entries: {
    pattern: "src/cli/**/*.ts",
  },
  emptyOutDir: true,
});
```

The plugin searches source files, not the generated `bin/` directory. It matches source basenames to object-form `package.json#bin` command names.

Generated Node.js executables always have a shebang. If the source already starts with a shebang, the plugin preserves it without adding another. Otherwise it adds `#!/usr/bin/env node`.

## Troubleshooting source collisions

A package bin must resolve to exactly one source file. For example, the default `src/**/*.ts` pattern makes both of these candidates for the `release` command:

```text
src/release.ts
src/cli/release.ts
```

The build reports a package bin source collision and lists every matching source. Narrow `entries.pattern` to the executable source directory:

```ts
packageBinBuild({
  entries: {
    pattern: "src/cli/**/*.ts",
  },
  emptyOutDir: true,
});
```

Do not remove collision detection or point discovery at `bin/`; `bin/` is build output, while `entries.pattern` identifies source entry points.
