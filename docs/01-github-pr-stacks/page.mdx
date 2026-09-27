# GitHub PR stacks

A stacked pull request chain keeps each change focused while allowing later work to build on earlier changes.

## Create the GitHub base-chain

Create each branch from the branch immediately below it, and open each pull request against that parent branch instead of opening every pull request against `main`.

For example:

```text
main
└── feat/workspace-tools-release-parity       # PR #1
    └── feat/readme-screenshot-tooling        # PR #2
        └── feat/github-pages-workflow        # PR #3
```

The corresponding pull request bases are:

```text
PR #1: feat/workspace-tools-release-parity → main
PR #2: feat/readme-screenshot-tooling → feat/workspace-tools-release-parity
PR #3: feat/github-pages-workflow → feat/readme-screenshot-tooling
```

This is the GitHub base-chain. GitHub now understands the dependency between the pull requests even before the branches are registered with the stack CLI.

## Adopt the existing branches with `gh stack`

After the branches and pull requests exist on GitHub, register the existing branch chain with the GitHub stack CLI:

```sh
gh stack init \
  feat/workspace-tools-release-parity \
  feat/readme-screenshot-tooling \
  feat/github-pages-workflow
```

This adopts the existing branches; it does not require recreating the pull requests.

Verify the stack:

```sh
gh stack view
```

For a compact view:

```sh
gh stack view --short
```

For machine-readable output:

```sh
gh stack view --json
```

## Merge order

Merge from the bottom of the dependency chain upward:

```text
PR #1 → PR #2 → PR #3
```

After a parent pull request is merged, update or restack the remaining branches with the stack CLI as needed so their bases continue to reflect the intended chain.

## GitHub API versus stack CLI

Creating branches and setting pull request bases establishes the remote GitHub base-chain. The `gh stack` CLI adds stack-management metadata and commands on top of that remote structure.

For automation that cannot execute the CLI, creating the correct branch ancestry and pull request bases is still the essential GitHub-side representation of the stack.

## Sync a child PR after its parent changes

Suppose the stack is:

```text
main
└── fix/main-package-tests          # PR #28
    └── feat/demo-tools-playground  # PR #29
```

If PR #28 receives new commits after PR #29 was created, rebase the child branch onto the latest parent branch:

```sh
git fetch origin
git switch feat/demo-tools-playground
git rebase origin/fix/main-package-tests
git push --force-with-lease
```

This replays the child PR's commits on the latest parent head and keeps the stack linear without adding a merge commit.

### Explicit `--onto` form

When you know the old parent head and want to explicitly replay only the child PR delta:

```sh
git rebase --onto \
  origin/fix/main-package-tests \
  <old-parent-head> \
  feat/demo-tools-playground

git push --force-with-lease
```

In other words: take the commits after `<old-parent-head>` that belong to the child PR and replay them on the current parent head.

### Inspect the PR branches with GitHub CLI

Inspect the parent:

```sh
gh pr view 28 \
  --json headRefName,headRefOid \
  --jq '{branch: .headRefName, sha: .headRefOid}'
```

Inspect the child and its configured base:

```sh
gh pr view 29 \
  --json baseRefName,headRefName,headRefOid \
  --jq '{base: .baseRefName, branch: .headRefName, sha: .headRefOid}'
```

### Verify the stack is synchronized

```sh
git fetch origin

git rev-list --left-right --count \
  origin/fix/main-package-tests...origin/feat/demo-tools-playground
```

For a child PR containing one unique commit, this result:

```text
0	1
```

means the child is zero commits behind its parent and one commit ahead.

### Short form

For the common case:

```sh
git fetch origin &&
git switch feat/demo-tools-playground &&
git rebase origin/fix/main-package-tests &&
git push --force-with-lease
```

