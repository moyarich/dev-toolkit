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

See [docs/readme-dev.md](docs/readme-dev.md) for architecture and development guidance.
