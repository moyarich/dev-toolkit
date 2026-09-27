# @moyarich/workspace-tools

Workspace-aware release and publishing commands used by the reusable workflows in `moyarich/dev-toolkit`.

## Commands

### `workspace-release`

Create or preview a package release from a package under `packages/*`.

```sh
workspace-release <package>=<version> [--mode=bump|exact|current] [--version=<value>] [--dry-run]
```

Release modes:

- `bump` — uses an npm version bump: `patch`, `minor`, `major`, `prepatch`, `preminor`, `premajor`, or `prerelease`.
- `exact` — uses an exact SemVer.
- `current` — releases the version already present in the package manifest.
- `--dry-run` — previews the resolved version, registry state, and changelog without changing the repository.

### `workspace-publish`

Validate and publish a workspace package.

```sh
workspace-publish <package> [--registry=github|npm|both] [--tag=latest] [--access=public|restricted] [--ls] [--with-dependencies[=true|false]] [--dry-run[=true|false]]
```

Use `--ls` to print the resolved publish plan without validating or publishing. Combine `--ls --dry-run` to print that plan and then validate/test/pack it without publishing. Use `--with-dependencies` (or `--with-dependencies=true`) to include internal workspace dependencies first in dependency order; `--with-dependencies=false` selects only the requested package.\n\nGitHub Packages uses `_GITHUB_TOKEN`. npm publishing uses `_NPM_TOKEN`.

## Reusable workflows

The package is the CLI implementation behind the repository's generic npm release and publish workflows. Package-specific workflows should delegate to those generic workflows rather than duplicate their release logic.
