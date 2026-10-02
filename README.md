# dev-toolkit

Shared development infrastructure for `moyarich` repositories.

## What belongs here

- Reusable GitHub Actions workflows in `.github/workflows/`
- Reusable Node.js developer tooling in `packages/`
- Documentation for developing and consuming the tooling in `docs/`

## Packages

### `@moyarich/workspace-tools`

Home for reusable workspace release and publish commands.

Planned commands:

- `workspace-release`
- `workspace-publish`

### `@moyarich/vscode-test-cleaner`

Interactive and automation-friendly cleanup for VS Code test environments created by `@vscode/test-electron`.

- Discovers `.vscode-test` caches recursively.
- Reports cache sizes before deletion.
- Uses `fzf` automatically in interactive TTYs when available.
- Supports safe non-interactive cleanup with `--all`, `--dry-run`, `--yes`, and `--json`.
- Validates every deletion target against the discovered cache set.

See [packages/vscode-test-cleaner/README.md](packages/vscode-test-cleaner/README.md).

### `@moyarich/demo-tools`

Strategy-first automation for creating demos, screenshots, and recordings.

Consumer repositories keep self-contained demos under:

```text
demo/strategies/<strategy>/
```

Each strategy owns its product-specific demo code and explicitly imports shared
Playwright, browser, VS Code, capture, or process utilities when needed.

See [packages/demo-tools/README.md](packages/demo-tools/README.md).

## Reusable workflows

Reusable workflows live directly in `.github/workflows/` so other repositories can call them with GitHub Actions `workflow_call`.

Tooling workflows prefer the local package under `packages/`. They run `npm run build`
before invoking its generated command directly with Node. This also works when
installation ran before generated files existed and npm created no command links. When the package
is absent, they install its `@latest` release from GitHub Packages into a temporary
directory and invoke that installation. The workflow token needs read access to
the published package.

For local development, run `npm ci` followed by `npm run build`. The root build
bootstraps the shared build plugin and web components, then builds every workspace.
The plugin is imported from `dist`, so run this root build before individual package
commands on a fresh checkout. Run `npm run test:workflows` to check local and
published-tool resolution without accessing the registry.

Package CI discovers only Git-tracked `package.json` files directly beneath the
selected packages directory that define a test script. It excludes `node_modules`,
untracked packages, and nested packages. Stage a new package manifest with Git
before testing its discovery locally.

The discovery job compiles its dependency-free local helper with Node 24 instead
of installing or building the workspace. If that helper is absent, it installs
the latest published workspace tools in a temporary directory. One preparation job installs dependencies and builds all local packages, then
shares a compressed archive with the package-check jobs. Each matrix job restores
its own copy and runs tests, lint, and typecheck without repeating installation
or the full build. The archive preserves executable permissions and workspace
symlinks. Running Node CI independently still installs and builds normally.

See [Getting started](docs/01-getting-started/page.mdx) for architecture and development guidance.

See [Package release workflow](docs/02-guides/04-package-release-workflow/page.mdx) for the draft → release → publish lifecycle, canonical release identity, and GitHub Release finalization rules.
