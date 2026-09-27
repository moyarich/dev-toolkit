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

## Reusable workflows

Reusable workflows live directly in `.github/workflows/` so other repositories can call them with GitHub Actions `workflow_call`.

See [docs/readme-dev.md](docs/readme-dev.md) for architecture and development guidance.
