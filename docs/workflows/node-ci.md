# Node CI workflow

Use `node-ci.yml` for the standard Node workspace CI checks.

## Copy and paste

Create `.github/workflows/ci.yml` in the consuming repository:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
  workflow_dispatch:

jobs:
  ci:
    uses: moyarich/dev-toolkit/.github/workflows/node-ci.yml@v1
    with:
      node-version: "22"
```

The repository must have a committed `package-lock.json`. The reusable workflow runs:

```sh
npm ci
npm test
npm run lint --if-present
npm run typecheck --if-present
```

If the repository does not define `lint` or `typecheck`, those optional commands are skipped. `npm test` is required.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `node-version` | No | `22` | Node.js version used by CI |
