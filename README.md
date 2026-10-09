# dev-toolkit

Node.js development packages and command-line tools maintained in this monorepo. Cross-repository workflow automation and workspace release tooling are maintained separately.

## Repository ownership

| Repository                                                                    | What it provides                                                             |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [moyarich/dev-toolkit](https://github.com/moyarich/dev-toolkit)               | Developer packages, CLIs, demos, and repository-specific CI                  |
| [moyarich/reusable-workflows](https://github.com/moyarich/reusable-workflows) | Reusable GitHub Actions workflows, their examples and workflow documentation |
| [moyarich/workspace-tools](https://github.com/moyarich/workspace-tools)       | Workspace discovery, dependency, lockfile, release, and publishing CLIs      |

## Packages

- [Git history cleanup](packages/git-history-cleanup/README.md) — inspect historical blobs and select paths for safe history cleanup.
- [VS Code test cleaner](packages/vscode-test-cleaner/README.md) — clean test installations.
- [Demo tools](packages/demo-tools/README.md) — build repeatable demos, screenshots, and recordings.
- [Vite package-bin plugin](packages/vite-plugin-package-bin/README.md) — create package executables.
- [README screenshots](packages/readme-screenshots/README.md) — capture documentation screenshots.
- [VS Code extension tools](packages/vs-code-ext-tools/README.md) — build and test extensions.

## CI example

Call the shared workflow from your repository rather than copying its implementation:

```yaml
name: Package CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
  packages: read
jobs:
  packages:
    uses: moyarich/reusable-workflows/.github/workflows/reusable_package-ci.yml@v0
    with:
      packages-directory: packages
      node-version: "24"
```

For repository-wide formatting, use `reusable_prettier.yml` with `mode: check` on pull requests or `mode: fix` for a writable maintenance workflow. `prettier-config: this-repository` uses the caller's own formatting rules.

For all supported workflows, inputs, and copyable examples, see the [reusable-workflows examples](https://github.com/moyarich/reusable-workflows/tree/main/examples).

## Development

```sh
npm ci
npm test
npm run lint
npm run typecheck
```

Repository-specific architecture and package guidance: [Getting started](docs/01-getting-started/page.mdx). CLI usage for workspace releases and publishing belongs in [workspace-tools](https://github.com/moyarich/workspace-tools).
