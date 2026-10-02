# moyarich-auto-glow-md

Shell-native Oh My Zsh plugin that automatically renders Markdown-looking command output with Glow.

The plugin does not require Node.js, npm, node-pty, a compiled CLI, or a generated bin directory at runtime.

## Documentation

Detailed package documentation:

- [Documentation index](./docs/page.mdx)
- [Getting started](./docs/01-getting-started/page.mdx)
- [Architecture](./docs/02-guides/01-architecture/page.mdx)
- [Testing](./docs/03-reference/01-testing/page.mdx)

## Requirements

- Zsh
- Oh My Zsh
- Glow

Verify Glow is available:

    command -v glow

## Install with sparse checkout

Clone only this plugin from the dev-toolkit monorepo:

    git clone --filter=blob:none --sparse \
      git@github.com:moyarich/dev-toolkit.git \
      "${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/dev-toolkit"

    cd "${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/dev-toolkit"
    git sparse-checkout set packages/moyarich-auto-glow-md

Install the plugin from the package directory:

    cd "${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/dev-toolkit/packages/moyarich-auto-glow-md"
    ./install.sh

Copy installation is the default. It installs everything under:

    ${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/plugins/moyarich-auto-glow-md

The installed layout is:

    moyarich-auto-glow-md/
    ├── bin/
    │   └── moyarich-auto-glow-md
    ├── lib/
    │   └── core.zsh
    ├── moyarich-auto-glow-md.plugin.zsh
    ├── install.sh
    ├── uninstall.sh
    └── README.md

The plugin adds its own `bin/` directory to Zsh's `PATH` when Oh My Zsh loads it, so no separate `~/.local/bin` installation is required.

From the monorepo workspace:

    npm run plugin:install --workspace @moyarich/auto-glow-md

The installer always prints the next steps: enable the plugin in `~/.zshrc`, reload the current shell with `source ~/.zshrc`, verify the command with `command -v moyarich-auto-glow-md`, and run a quick smoke test.

Installation is verbose by default and prints the resolved install mode, source package path, Oh My Zsh destination, and each copy/link operation.

For minimal output:

    npm run plugin:install:quiet --workspace @moyarich/auto-glow-md

For development, use symlinks instead of copies:

    ./install.sh --symlink

or:

    npm run plugin:install:symlink --workspace @moyarich/auto-glow-md

Verbose development install:

    npm run plugin:install:symlink:verbose --workspace @moyarich/auto-glow-md

The symlink mode still creates the normal Oh My Zsh plugin directory, but its runtime files are symlinked back to the current checkout so code changes are immediately visible.

To uninstall either installation mode:

    npm run plugin:uninstall --workspace @moyarich/auto-glow-md

The uninstaller removes symlinks directly and only removes copied plugin directories created by this installer. It refuses to recursively delete an unmanaged directory.

Reload Zsh so Oh My Zsh loads the plugin and adds its bundled `bin/` directory to `PATH`:

    source ~/.zshrc

Verify the CLI:

    command -v moyarich-auto-glow-md

The expected path is under:

    ${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/plugins/moyarich-auto-glow-md/bin/moyarich-auto-glow-md

## Enable the plugin

Add it to ~/.zshrc:

    plugins=(
      git
      moyarich-auto-glow-md
    )

Reload Zsh:

    source ~/.zshrc

Oh My Zsh discovers the plugin directly from:

    moyarich-auto-glow-md/
    ├── src/
    │   └── cli/
    │       └── moyarich-auto-glow-md.sh
    ├── lib/
    │   └── core.zsh
    ├── test/
    │   └── run-tests.zsh
    ├── moyarich-auto-glow-md.plugin.zsh
    ├── install.sh
    ├── uninstall.sh
    ├── README.md
    └── docs/

## Usage

Run commands normally:

    git status
    python script.py
    go test ./...
    curl https://example.com

When output looks like Markdown, it is rendered through Glow. Ordinary output is printed as normal text.

Example:

    printf '# Build Results\n\n| Package | Status |\n| --- | --- |\n| api | passing |\n'

## Shell-state commands

Commands that modify the current shell bypass the capture path, including:

    cd
    source
    .
    export
    unset
    alias
    unalias
    setopt
    unsetopt
    pushd
    popd
    jobs
    fg
    bg
    wait
    disown
    exec
    exit

## Runtime model

    ZLE accept-line
         |
         +-- shell-state command -----------> normal Zsh execution
         |
         +-- other command
                |
                +-- capture output
                |
                +-- Markdown? -> glow
                |
                +-- otherwise -> print unchanged

There is no Node runtime dependency.

## Run the CLI from source

The shell CLI source lives under `src/cli/`, not in `bin/`:

    zsh src/cli/moyarich-auto-glow-md.sh -- printf '# Hello\n'

You can run normal commands through the source CLI while developing:

    zsh src/cli/moyarich-auto-glow-md.sh -- git status
    zsh src/cli/moyarich-auto-glow-md.sh -- python script.py
    zsh src/cli/moyarich-auto-glow-md.sh -- go test ./...

The source CLI shares its implementation with the Oh My Zsh plugin through `lib/core.zsh`.

## Build

`dist/` is the publishable runtime package. Source, tests, and development docs stay outside it.

Build the package:

    npm run build --workspace @moyarich/auto-glow-md

The build assembles:

    dist/
    ├── bin/
    │   └── moyarich-auto-glow-md.sh
    ├── lib/
    │   └── core.zsh
    ├── moyarich-auto-glow-md.plugin.zsh
    ├── install.sh
    ├── uninstall.sh
    └── README.md

The shell CLI is copied from `src/cli/` into `dist/bin/` and made executable. The runtime library, plugin entry file, installer, and README are copied into `dist/`.

Only `dist/` is included in the package tarball.

You can validate the assembled runtime package with:

    npm run test:dist --workspace @moyarich/auto-glow-md

## Development

Syntax-check the shell files and run the behavioral tests:

    zsh -n moyarich-auto-glow-md.plugin.zsh
    zsh -n lib/core.zsh
    zsh -n src/cli/moyarich-auto-glow-md.sh
    sh -n install.sh
    sh -n uninstall.sh
    zsh test/run-tests.zsh

From the dev-toolkit workspace, the same checks are available through:

    npm test --workspace @moyarich/auto-glow-md

Or run only the behavioral shell tests:

    npm run test:shell --workspace @moyarich/auto-glow-md

The tests exercise Markdown detection, bypass behavior, command output, exit-status preservation, and the source shell CLI. `test:dist` validates the assembled `dist/` runtime package, including the generated CLI.

npm is only a monorepo development convenience. It is not required to install or run the plugin or CLI.

## Current limitation

The shell-native implementation captures command output before deciding whether to render it. Commands that rely heavily on interactive TTY behavior, live progress redraws, or full-screen terminal interfaces should be bypassed or run with the plugin disabled for that command.

## Troubleshooting plugin discovery

If Oh My Zsh reports:

```text
[oh-my-zsh] plugin 'moyarich-auto-glow-md' not found
```

but the installer reports that the plugin path already exists, the existing entry may be a stale or broken symlink.

Inspect it with:

```bash
ls -l "${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/plugins/moyarich-auto-glow-md"
```

Then rerun:

```bash
npm run plugin:install --workspace @moyarich/auto-glow-md
```

The installer now defaults to a managed copy installation. If a stale symlink exists, the copy installer replaces it. It refuses to overwrite an unmanaged real directory.

Use `--symlink` only when you intentionally want the plugin connected to the working checkout.

After installation, verify the plugin entry file exists:

```bash
test -f "${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/plugins/moyarich-auto-glow-md/moyarich-auto-glow-md.plugin.zsh"
```

Then reload Zsh:

```bash
source ~/.zshrc
```
