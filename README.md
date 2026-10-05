# dev-toolkit

Reusable Node.js developer tooling and packages for `moyarich` projects.

Cross-repository GitHub Actions workflows now live in [`moyarich/actions`](https://github.com/moyarich/actions). This repository keeps the packages and CLIs those workflows consume.

## What belongs here

- reusable Node.js developer tooling in `packages/`
- package-specific documentation in `packages/*/docs/`
- development documentation for this monorepo in `docs/`
- repository-local workflows that build, test, release, or publish these packages

## Packages

### `@moyarich/git-history-cleanup`

Interactive and scriptable Git history inspection and cleanup.

- Lists the largest reachable historical blobs.
- Browses deleted and current historical paths as a virtual filesystem.
- Shows aggregate historical size, largest blob size, and blob counts.
- Multi-selects files and directories before rewriting history with `git filter-repo`.
- Keeps remote pushes opt-in while still supporting scripted cleanup.

See [packages/git-history-cleanup/README.md](packages/git-history-cleanup/README.md).

### `@moyarich/vscode-test-cleaner`

Interactive and automation-friendly cleanup for VS Code test environments created by `@vscode/test-electron`.

### `@moyarich/demo-tools`

Strategy-first automation for creating demos, screenshots, and recordings.

## GitHub Actions

Public reusable workflows were moved to:

```text
https://github.com/moyarich/actions
```

Consumer repositories should call the released workflows from that repository. `@moyarich/workspace-tools` moved with the workflow platform to `moyarich/actions`; `dev-toolkit` remains the home of general-purpose developer packages such as `@moyarich/readme-screenshots` and `@moyarich/vite-plugin-package-bin`.

See [Getting started](docs/01-getting-started/page.mdx) for monorepo development guidance.
