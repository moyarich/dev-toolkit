# AGENTS.md

## Repository workflow

Keep changes small, explicit, and scoped to the package or concern being changed. Preserve package ownership boundaries and avoid moving implementation behind unnecessary abstractions.

## Pull requests

Keep pull requests focused on the change they introduce.

Before creating or updating a PR:

- inspect the PR-local diff and include only the intended change;
- use a concise title that describes that change;
- keep the PR body short and limited to information needed to understand or review the PR;
- include implementation details when they materially help reviewers understand architecture, non-obvious behavior, tradeoffs, compatibility or migration concerns, or why a particular approach was chosen;
- omit implementation narration that merely restates the diff, along with unrelated history, troubleshooting notes, or other review-irrelevant noise;
- do not describe changes inherited from a parent PR as though they belong to the child PR;
- mention stack relationships only when needed to identify the immediate parent or review order;
- run the relevant checks before considering the PR ready.

When creating a normal PR, target the intended integration branch, usually `main`.

When creating a stacked PR, target the immediate parent branch:

```text
PR A: branch-a -> main
PR B: branch-b -> branch-a
PR C: branch-c -> branch-b
```

Before opening the PR, verify its local delta against the intended base:

```sh
git fetch origin
git log --oneline origin/<base-branch>..HEAD
git diff origin/<base-branch>...HEAD
```

Create the PR only after the diff contains exactly the work intended for that PR. After creation, confirm the PR base is still the intended branch and keep the title/body synchronized with the PR-local delta as the stack changes.

## Stacked pull requests

This repository uses stacked pull requests. Treat the stack as an ordered dependency chain: every newer PR contains and depends on the final head of the PR directly below it.

### Required invariant

A descendant branch must never remain based on an outdated version of an earlier branch in its stack.

If an earlier PR is edited after one or more PRs have been stacked on top of it, immediately sync those changes through **every newer branch in stack order** before continuing work on the descendants.

For example:

```text
main
└── PR A / branch-a
    └── PR B / branch-b
        └── PR C / branch-c
```

If `branch-a` changes, rebuild/sync `branch-b` from the new `branch-a` head, then rebuild/sync `branch-c` from the new `branch-b` head.

Do not leave B or C pointing at the previous A history.

### Stack synchronization flow

```text
PR A changes
   ↓
sync PR B onto new A
   ↓
sync PR C onto new B
   ↓
verify ancestry + PR-local diffs
   ↓
continue development
```

### CLI: repair an out-of-sync child PR

For the common case where a child branch is behind or diverged from its direct parent, rebase the child onto the latest parent:

```sh
git fetch origin

git switch <child-branch>
git rebase origin/<parent-branch>
git push --force-with-lease
```

If the rebase reports conflicts:

```sh
git status

# Fix the conflicted files.
git add <fixed-files>
git rebase --continue
```

Repeat the conflict-resolution step until the rebase completes, then push with `--force-with-lease`.

Verify that the current parent is now an ancestor of the child:

```sh
git fetch origin

git merge-base --is-ancestor \
  origin/<parent-branch> \
  origin/<child-branch>

echo $?
```

An exit code of `0` means the parent → child ancestry is correct.

Then inspect only the child PR's delta:

```sh
git log --oneline \
  origin/<parent-branch>..origin/<child-branch>

git diff \
  origin/<parent-branch>...origin/<child-branch>
```

For a longer stack, repair branches from oldest to newest:

```text
PR A changes
   ↓
rebase PR B onto A
   ↓
push --force-with-lease B
   ↓
rebase PR C onto updated B
   ↓
push --force-with-lease C
   ↓
verify ancestry + PR-local diffs
```

When histories are more complicated and the old parent head is known, explicitly replay only the child's delta:

```sh
git rebase --onto <new-parent> <old-parent> <child-branch>
```

This form makes the stack operation explicit: take commits after `<old-parent>` that belong to `<child-branch>` and replay them onto `<new-parent>`.

### Preferred sync method

Keep stacked history linear. Prefer rebuilding the descendant branch from its updated parent and replaying **only that descendant PR's own delta**.

Conceptually:

```sh
git fetch origin

git switch branch-b
git rebase --onto origin/branch-a <old-branch-a-head> branch-b

git switch branch-c
git rebase --onto origin/branch-b <old-branch-b-head> branch-c
```

Equivalent cherry-pick/rebuild workflows are acceptable when they make the PR-local delta clearer.

Avoid merge commits whose only purpose is synchronizing one branch in a stack with its parent.

After rewriting a published stacked branch, update the remote safely:

```sh
git push --force-with-lease origin branch-b
git push --force-with-lease origin branch-c
```

Never use an unconditional force push when `--force-with-lease` is sufficient.

### Before editing a stacked PR

1. Identify the PR's direct parent branch and all descendant PRs.
2. Confirm the working branch contains the current head of its parent.
3. If the parent changed, sync this branch before adding new work.
4. After changing an earlier PR, propagate that new head through every descendant before considering the stack consistent.

### Verification

For every adjacent pair in the stack, verify the descendant is based on the current parent and inspect its PR-local diff.

Useful checks:

```sh
git fetch origin

git merge-base --is-ancestor origin/branch-a origin/branch-b
git merge-base --is-ancestor origin/branch-b origin/branch-c

git log --oneline origin/branch-a..origin/branch-b
git diff origin/branch-a...origin/branch-b

git log --oneline origin/branch-b..origin/branch-c
git diff origin/branch-b...origin/branch-c
```

`git merge-base --is-ancestor` must succeed for each parent → child relationship.

The diff for a PR should contain only that PR's intended delta. If changes belonging to an earlier PR appear again in a descendant's diff, the stack is not synchronized correctly.

### Pull request bases

Each stacked PR should target its immediate parent branch, not `main`.

Using the example above:

```text
PR A: branch-a -> main
PR B: branch-b -> branch-a
PR C: branch-c -> branch-b
```

Only retarget a descendant PR to `main` when its parent has been merged and the stack is intentionally being collapsed.

### When an earlier PR is amended

Do not treat an update to an earlier PR as complete until all of the following are true:

- the earlier branch contains the fix;
- every descendant has been replayed on the updated parent in order;
- each parent is an ancestor of its direct child;
- each PR diff contains only its intended changes;
- each PR still targets the correct immediate parent branch;
- tests/checks are rerun where the inherited change can affect the descendant.

This propagation is part of the original change, not optional cleanup.
