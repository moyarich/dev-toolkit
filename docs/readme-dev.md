# Development Guide

This repository centralizes development tooling that is reusable across multiple repositories.

## Architecture

The repository has two primary forms of reusable infrastructure:

### GitHub Actions workflows

Reusable workflows belong in:

```text
.github/workflows/
```

GitHub requires reusable workflow files to live directly in that directory. They should expose `workflow_call` and define inputs or secrets when callers need configuration.

Consumer repositories should keep small caller workflows and delegate implementation here.

Example:

```yaml
jobs:
  ci:
    uses: moyarich/dev-toolkit/.github/workflows/node-ci.yml@v1
```

Prefer version tags for consumers rather than permanently referencing `main`.

### Node.js tooling

Reusable JavaScript tooling belongs in:

```text
packages/
```

The initial package is:

```text
packages/workspace-tools/
```

It is intended to own related release and publishing commands such as:

```text
workspace-release
workspace-publish
```

Keeping these commands in a package allows fixes and features to be released centrally instead of copying scripts between repositories.

## Repository layout

```text
dev-toolkit/
├── .github/
│   └── workflows/
├── docs/
│   └── readme-dev.md
├── packages/
│   └── workspace-tools/
│       ├── bin/
│       ├── src/
│       └── package.json
├── package.json
└── README.md
```

## Development

Install workspace dependencies from the repository root:

```sh
npm install
```

Run package tests:

```sh
npm test
```

Run available lint and typecheck scripts:

```sh
npm run lint
npm run typecheck
```

## Adding a package

Create a directory under `packages/` with its own `package.json`. The root npm workspace automatically includes `packages/*`.

A package should be split out when it has an independent responsibility or lifecycle. Closely related commands should remain together until maintaining them separately provides a concrete benefit.

## Workflow development

Keep repository-specific triggers in the consuming repository where appropriate. Put reusable jobs and implementation details here.

A reusable workflow should:

- declare `on.workflow_call`
- expose only necessary inputs and secrets
- provide sensible defaults
- avoid assumptions about a specific consuming repository
- pin third-party actions appropriately
- document breaking changes

## Versioning

Shared tooling should be versioned deliberately because changes can affect many repositories.

For reusable workflows, consumers can reference a stable major tag:

```yaml
uses: moyarich/dev-toolkit/.github/workflows/node-ci.yml@v1
```

For npm packages, use normal semantic versioning.

## Migration

Reusable scripts and workflows should be migrated from existing repositories only after identifying which behavior is truly generic. Repository-specific behavior should remain in the consuming repository or be exposed as explicit configuration.


## Workspace tools

The reusable CLI package currently provides:

```sh
workspace-release <package>=<version-spec>
workspace-publish [<package>] [--registry=github|npm|both] [--tag=latest] [--access=public|restricted] [--dry-run]
```

Examples:

```sh
workspace-release css-expand-collapse=patch
workspace-publish css-expand-collapse --dry-run
workspace-publish css-expand-collapse --registry=github
workspace-publish css-expand-collapse --registry=npm --tag=next
workspace-publish css-expand-collapse --registry=both
workspace-publish --dry-run
```

`workspace-release` preserves the package-qualified tag convention:

```text
<package-directory>@<version>
```

It requires a clean working tree, delegates version calculation to `npm version`, commits the package manifest and lockfile, and creates the tag.

`workspace-publish` validates the selected workspace before publishing. GitHub Packages uses `npm publish`; npmjs.org uses staged publishing so human approval with 2FA remains a separate step.

Credential environment variables are intentionally registry-specific:

```text
_GITHUB_TOKEN
_NPM_TOKEN
```

They are mapped to `NODE_AUTH_TOKEN` only for the npm subprocess.

## Migration from repository-local tooling

The initial implementation was extracted from `moyarich/css-expand-collapse`.

The migration deliberately separates:

- generic package selection, validation, versioning, tagging, and registry publishing → `@moyarich/workspace-tools`;
- reusable GitHub job implementation → `.github/workflows/`;
- repository-specific triggers, playground builds, browser tests, and package-specific checks → consuming repositories.

Until `@moyarich/workspace-tools` has an initial published version, consumers should not depend on `npx @moyarich/workspace-tools` from reusable workflows. Publish/version the package first, then pin consumers to an appropriate released version.


## README screenshot tooling

`@moyarich/readme-screenshots` extracts the reusable README screenshot automation originally used by `pointer-bubble`.

The package intentionally does not know about a specific playground, framework, heading, component, or screenshot filename. Consumers provide those details in `readme-screenshots.config.mjs`.

```js
export default {
  url: "http://127.0.0.1:5173",
  outputDir: "docs/screenshots",
  screenshots: [
    { name: "playground-overview.png" },
    {
      name: "feature-example.png",
      selector: '[data-readme-screenshot="feature-example"]',
      scrollIntoView: true,
      waitForMs: 500,
    },
  ],
};
```

Run locally with:

```sh
readme-screenshots
readme-screenshots path/to/config.mjs
```

The reusable workflow accepts the site start command, URL, config path, output directory, Node version, Playwright version, and commit message. A consumer keeps only its trigger and repository-specific inputs:

```yaml
name: README screenshots

on:
  workflow_dispatch:

jobs:
  screenshots:
    uses: moyarich/dev-toolkit/.github/workflows/readme-screenshots.yml@v1
    with:
      start-command: npm run dev --workspace @scope/playground -- --host 127.0.0.1
      url: http://127.0.0.1:5173
      config: readme-screenshots.config.mjs
      output-directory: docs/screenshots
```

The workflow commits only the configured output directory when generated screenshots change.


### Automatic screenshot generation

A screenshot config is optional. With no config, the runner automatically captures the configured site URL at a 1440×1000 viewport and writes:

```text
docs/screenshots/playground-overview.png
```

This is the recommended default for new repositories. A consumer workflow only needs to provide the command that starts its preview/dev server:

```yaml
jobs:
  screenshots:
    uses: moyarich/dev-toolkit/.github/workflows/readme-screenshots.yml@v1
    with:
      start-command: npm run dev -- --host 127.0.0.1
```

Repositories that need additional or sectional screenshots can add `readme-screenshots.config.mjs`. For example, `pointer-bubble` can preserve its overview plus MapLibre capture by configuring the second screenshot with a stable selector. Prefer a dedicated `data-readme-screenshot` attribute over visible heading text so documentation automation does not break when copy changes.

The generated screenshot files remain owned by the consuming repository. The reusable workflow starts the site, waits for its URL, invokes the shared capture package, and commits changed files from the configured output directory.
