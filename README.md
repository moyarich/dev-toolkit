# dev-toolkit

Reusable Node.js developer tooling and packages for `moyarich` projects.

Cross-repository GitHub Actions workflows now live in [`moyarich/actions`](https://github.com/moyarich/actions). This repository keeps the packages and CLIs those workflows consume.

## What belongs here

- reusable Node.js developer tooling in `packages/`
- package-specific documentation in `packages/*/docs/`
- development documentation for this monorepo in `docs/`
- repository-local workflows that build, test, release, or publish these packages

## Packages

### `@moyarich/workspace-tools`

Reusable workspace release and publishing commands, including package discovery and canonical release identity.

### `@moyarich/vscode-test-cleaner`

Interactive and automation-friendly cleanup for VS Code test environments created by `@vscode/test-electron`.

### `@moyarich/demo-tools`

Strategy-first automation for creating demos, screenshots, and recordings.

## GitHub Actions

Public reusable workflows were moved to:

```text
https://github.com/moyarich/actions
```

Consumer repositories should call the released workflows from that repository. `dev-toolkit` remains the home of supporting npm packages such as `@moyarich/workspace-tools` and `@moyarich/readme-screenshots`.

See [Getting started](docs/01-getting-started/page.mdx) for monorepo development guidance.
