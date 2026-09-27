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
