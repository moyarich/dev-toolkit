# Test workflows locally with ACT

Run ACT from the repository root. ACT Visual Runner uses the same workflows and inputs; select **workflow_dispatch** when testing them manually. A `push` event does not run a workflow that only declares `workflow_dispatch` and `workflow_call`.

Run workflows one at a time, especially a reusable workflow and its caller. Overlapping ACT runs can collide with local job containers.

The repository `.actrc` selects Linux AMD64 containers and stores uploaded artifacts under `/tmp/artifacts`. Use the `catthehacker/ubuntu:act-latest` image. Supply a valid `GITHUB_TOKEN` through ACT Visual Runner's secrets for issue queries and authenticated registry access. ACT does not create GitHub's automatic token locally.

For a terminal session authenticated with GitHub CLI:

```sh
export GITHUB_TOKEN="$(gh auth token)"
act workflow_dispatch -W .github/workflows/package-tests-ci.yml \
  -s GITHUB_TOKEN -P ubuntu-latest=catthehacker/ubuntu:act-latest
```

## Workflow inputs

| Workflow file | Inputs for a local test |
| --- | --- |
| `package-tests-ci.yml` | Defaults; runs all discovered package tests |
| `reusable_package-tests.yml` | Defaults |
| `reusable_node-ci.yml` | `package-directory=.` to test, lint, and typecheck all workspaces |
| `package-workspace-tools-release.yml` | `dry-run=true`, `publish=false` |
| `reusable_npm-release.yml` | `dry-run=true`, `publish=false`; package defaults to `packages/workspace-tools` |
| `package-workspace-tools-publish.yml` | `dry-run=true`; optional `version` must match the package manifest |
| `reusable_npm-publish.yml` | `dry-run=true`; package defaults to `packages/workspace-tools` |
| `reusable_npm-package-lock.yml` | `commit=false` |
| `playground-pages.yml` | Defaults |
| `reusable_github-pages.yml` | `build-command=npm run build --workspace @moyarich/demo-tools-playground`, `output-directory=apps/playground/dist` |
| `reusable_readme-screenshots.yml` | `start-command=npm run dev --workspace @moyarich/demo-tools-playground -- --host 0.0.0.0`; default URL is `http://127.0.0.1:5173` |
| `reusable_manage-issue-dependencies.yml` | An existing `issue`, `related_issues`, and `dry_run=true` |
| `set-issue-dependencies.yml` | Defaults; previews the configured relationships |
| `reusable_show-issue-dependency-tree.yml` | Defaults; reads the repository's issues |

For example:

```sh
act workflow_dispatch -W .github/workflows/reusable_github-pages.yml \
  --input 'build-command=npm run build --workspace @moyarich/demo-tools-playground' \
  --input output-directory=apps/playground/dist \
  -s GITHUB_TOKEN -P ubuntu-latest=catthehacker/ubuntu:act-latest
```

## What a local success verifies

- Tests and builds execute inside ACT's Linux containers.
- Pages builds and uploads its artifact; deployment runs only on GitHub, where OIDC is available. Local builds use the repository's conventional GitHub Pages base path.
- Publishing validates the package with `--dry-run` under ACT and never uploads it. GitHub runs retain the supplied `dry-run` setting.
- Issue workflows query real GitHub data; local dependency changes are previews.
- Lockfile and screenshot workflows generate their outputs but do not commit or push from ACT.
- Release previews verify that HEAD, tags, and working-tree status remain unchanged. Explicitly setting release `dry-run=false` can still perform a real release; use `true` for testing.

Commit pending changes before running release previews. The release workflow requires a clean tree and restores tracked files after dependency installation. A successful local run does not verify production publishing credentials, GitHub branch rules, or Pages deployment settings.
