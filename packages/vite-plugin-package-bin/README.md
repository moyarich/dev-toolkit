# @moyarich/vite-plugin-package-bin

Vite plugin for building `package.json#bin` entries as independent executables.

It supports:

- TypeScript/JavaScript CLI sources built to standalone Node.js `.mjs` files
- Shell CLI sources under `src/cli/**/*.sh`, copied directly to `bin/*.sh` and made executable

For the common case, source discovery includes:

```text
src/**/*.ts
src/cli/**/*.sh
```

## Node CLI example

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

Given:

```text
src/cli/release.ts
```

and:

```json
{
  "bin": {
    "release": "./bin/release.mjs"
  }
}
```

the plugin builds:

```text
bin/release.mjs
```

Generated Node.js executables always have a shebang. If the source already starts with a shebang, the plugin preserves it without adding another. Otherwise it adds `#!/usr/bin/env node`.

## Shell CLI example

Given:

```text
src/cli/install.sh
```

and:

```json
{
  "bin": {
    "install": "./bin/install.sh"
  }
}
```

the plugin copies the source to:

```text
bin/install.sh
```

and applies executable permissions:

```text
0755
```

Shell files are not bundled or transformed by Vite.

The shell source should contain its own shebang, for example:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Installing..."
```

## Explicit entry patterns

Use explicit entry rules when executable files live in dedicated directories or when library and CLI files share a basename:

```ts
packageBinBuild({
  entries: [
    {
      pattern: "src/cli/**/*.ts",
    },
    {
      pattern: "src/cli/**/*.sh",
      bin: "./bin/{name}.sh",
    },
  ],
  emptyOutDir: true,
});
```

The plugin searches source files, not the generated `bin/` directory. It matches source basenames to object-form `package.json#bin` command names.

## Troubleshooting source collisions

A package bin must resolve to exactly one source file.

For example, broad TypeScript patterns may make both of these candidates for the `release` command:

```text
src/release.ts
src/cli/release.ts
```

The build reports a package bin source collision and lists every matching source.

Narrow the configured entry pattern:

```ts
packageBinBuild({
  entries: [
    {
      pattern: "src/cli/**/*.ts",
    },
    {
      pattern: "src/cli/**/*.sh",
      bin: "./bin/{name}.sh",
    },
  ],
  emptyOutDir: true,
});
```

Do not remove collision detection or point discovery at `bin/`. The `bin/` directory is build output, while `entries.pattern` identifies source entry points.
