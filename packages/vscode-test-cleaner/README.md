# @moyarich/vscode-test-cleaner

Discover and safely remove VS Code test environments created by `@vscode/test-electron`.

The CLI is inspired by the cleanup workflow of `npkill`: discover disposable directories, show their sizes, select what to remove, and delete only validated candidates.

## Install

```sh
npm install @moyarich/vscode-test-cleaner
```

## Usage

Interactive terminals automatically use `fzf` when it is installed:

```sh
vscode-test-clean
```

Select multiple caches with fzf, then confirm deletion.

Non-interactive cleanup:

```sh
vscode-test-clean --all --yes
```

Preview without deleting:

```sh
vscode-test-clean --all --dry-run
```

Machine-readable discovery:

```sh
vscode-test-clean --json
```

Scan another root:

```sh
vscode-test-clean --root /path/to/workspaces
```

Disable fzf explicitly:

```sh
vscode-test-clean --no-fzf --all --dry-run
```

## Docker

Interactive mode requires stdin and a TTY:

```sh
docker run -it <image> vscode-test-clean
```

Without `-it`, use explicit non-interactive options:

```sh
docker run <image> vscode-test-clean --all --yes
```

## Safety

- Only discovered directories named `.vscode-test` are eligible for removal.
- Selected paths are validated against the discovery result before deletion.
- Deletion requires confirmation unless `--yes` is supplied.
- `--json` only reports discovery results and never deletes.
- `--dry-run` never deletes.

`fzf` is an optional external executable, not an npm dependency.

## Package layout

The published package uses `dist/` as its runtime boundary:

```text
dist/
└── bin/
    └── vscode-test-clean.mjs
```

The npm `bin` entry points to `dist/bin/vscode-test-clean.mjs`; TypeScript source and tests are not included in the package tarball.
