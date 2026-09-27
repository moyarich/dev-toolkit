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
workspace-publish <package> [--registry=github|npm|both] [--tag=latest] [--access=public|restricted] [--with-dependencies] [--dry-run]
```

Use `--with-dependencies` to publish internal workspace dependencies first in dependency order. Without it, only the selected package is published.\n\nGitHub Packages uses `_GITHUB_TOKEN`. npm publishing uses `_NPM_TOKEN`.

## Reusable workflows

The package is the CLI implementation behind the repository's generic npm release and publish workflows. Package-specific workflows should delegate to those generic workflows rather than duplicate their release logic.
