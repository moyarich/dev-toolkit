# Testing

The package keeps its test workflow sequential. It does not use `concurrently`.

## Main test command

The main test command is:

```bash
npm test --workspace @moyarich/auto-glow-md
```

That expands to:

```bash
zsh -n moyarich-auto-glow-md.plugin.zsh &&
zsh -n lib/core.zsh &&
zsh -n src/cli/moyarich-auto-glow-md.sh &&
sh -n install.sh &&
sh -n uninstall.sh &&
zsh test/run-tests.zsh
```

What each part does:

- `zsh -n moyarich-auto-glow-md.plugin.zsh`
  - parses the Oh My Zsh plugin
  - catches Zsh syntax errors
  - does not execute the plugin
- `zsh -n lib/core.zsh`
  - syntax-checks the shared runtime functions
- `zsh -n src/cli/moyarich-auto-glow-md.sh`
  - syntax-checks the source CLI
- `sh -n install.sh`
  - syntax-checks the installer
- `sh -n uninstall.sh`
  - syntax-checks the uninstaller
- `zsh test/run-tests.zsh`
  - actually executes the behavioral tests
  - tests Markdown detection
  - tests normal/non-Markdown output
  - tests shell-state bypass rules
  - tests command execution
  - tests exit-code preservation
  - tests the source CLI

The complete source-level flow is:

```text
Zsh syntax checks
    ↓
POSIX shell syntax checks
    ↓
behavioral shell tests
```

## Behavioral tests only

You can run only the behavioral tests with:

```bash
npm run test:shell --workspace @moyarich/auto-glow-md
```

## Test the distributable package

To test what will actually ship in `dist/`:

```bash
npm run test:dist --workspace @moyarich/auto-glow-md
```

That command first runs the build, then checks:

```text
dist/moyarich-auto-glow-md.plugin.zsh
dist/lib/core.zsh
dist/bin/moyarich-auto-glow-md.sh
dist/install.sh
dist/uninstall.sh
```

It then executes the built CLI with rendering disabled:

```bash
MOYARICH_AUTO_GLOW_DISABLE_RENDER=1 \
./dist/bin/moyarich-auto-glow-md.sh -- \
printf '%s' '# CLI works'
```

## Test command summary

```text
npm test
  = source syntax + source behavioral tests

npm run test:shell
  = behavioral tests only

npm run test:dist
  = build + verify the actual distributable package
```

## Why not concurrently?

The current test steps are short and intentionally ordered.

Sequential execution keeps failures easier to read and avoids adding another development dependency for little benefit.

For example, if a syntax check fails, there is no value in starting the behavioral tests at the same time.

The preferred flow is:

```text
syntax checks
    ↓
behavioral tests
    ↓
dist validation when requested
```

`concurrently` would only be useful if the package later gains several independent, long-running test groups that benefit materially from parallel execution.

## Test real Glow rendering

`test:dist` intentionally disables rendering so it can deterministically verify the built CLI output.

To exercise the real Markdown rendering path through Glow, run:

```bash
npm run test:glow --workspace @moyarich/auto-glow-md
```

That command:

1. verifies that `glow` is available on `PATH`
2. builds the package
3. runs the distributed CLI without `MOYARICH_AUTO_GLOW_DISABLE_RENDER`
4. sends a Markdown heading through the CLI:

```bash
./dist/bin/moyarich-auto-glow-md.sh -- \
printf '%s\n' '# CLI works'
```

Expected behavior: Glow renders the heading instead of printing the raw Markdown source unchanged.

The distinction is:

```text
npm run test:dist
  = deterministic dist validation with rendering disabled

npm run test:glow
  = real integration test using Glow rendering
```
