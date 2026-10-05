# @moyarich/git-history-cleanup

Interactive and scriptable Git history inspection and cleanup.

The package builds a virtual filesystem from reachable historical Git blobs, so
paths that no longer exist in the working tree can still be browsed, measured,
selected, and removed with `git filter-repo`.

## Install

```sh
npm install @moyarich/git-history-cleanup
```

`git-filter-repo` must also be available on `PATH`.

## Inspect the largest historical blobs

```sh
git-history-cleanup inspect
```

This is the package equivalent of:

```sh
git rev-list --objects --all \
  | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
  | sed -n 's/^blob //p' \
  | sort -k2nr \
  | head -50
```

Limit the report or scope it to a historical subtree:

```sh
git-history-cleanup inspect --limit 100
git-history-cleanup inspect packages/
git-history-cleanup inspect packages/visualize-css-colors/
```

Use `--json` for machine-readable output.

## Browse historical files interactively

```sh
git-history-cleanup browse
git-history-cleanup browse packages/
```

The browser is built from reachable Git objects, not the current filesystem.

It shows:

- aggregate historical size
- largest historical blob
- reachable blob count
- files and directories as a navigable virtual filesystem
- multi-selection for files and directories

### Keyboard controls

| Key               | Action                   |
| ----------------- | ------------------------ |
| `↑` / `↓`         | Move                     |
| `Enter` / `→`     | Open directory           |
| `←` / `Backspace` | Parent directory         |
| `Space`           | Toggle current path      |
| `/`               | Filter current directory |
| `a`               | Select visible entries   |
| `A`               | Clear visible entries    |
| `c`               | Clear all selections     |
| `x`               | Review and rewrite       |
| `q` / `Esc`       | Quit                     |

Selecting a directory stores one repository-relative path such as
`packages/visualize-css-colors/`. Descendant selections are automatically
collapsed when the parent directory already covers them.

## Remove paths non-interactively

```sh
git-history-cleanup remove packages/visualize-css-colors/ --yes
git-history-cleanup remove assets/old-demo.mov generated/archive.zip --yes
```

Multiple paths are sent to one `git filter-repo` invocation:

```sh
git filter-repo \
  --path packages/visualize-css-colors/ \
  --path assets/old-demo.mov \
  --invert-paths \
  --force
```

## Dry-run behavior

The default is intentionally remote-safe:

```sh
git-history-cleanup remove packages/visualize-css-colors/ --yes
```

This **does rewrite the local clone**. It verifies the removal and runs Git
garbage collection, but it does not push rewritten refs.

To force-push rewritten branches and tags:

```sh
git-history-cleanup remove packages/visualize-css-colors/ \
  --no-dry-run \
  --yes
```

The command remembers and restores the configured remote URL because
`git-filter-repo` may remove `origin` as a safety measure.

After a pushed rewrite, existing clones should be discarded and re-cloned.
