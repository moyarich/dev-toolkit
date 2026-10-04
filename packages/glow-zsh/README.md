# glow-zsh

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
    git sparse-checkout set packages/glow-zsh

Install the plugin from the package directory:

    cd "${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/dev-toolkit/packages/glow-zsh"
    ./install.sh

Copy installation is the default. It installs everything under:

    ${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/plugins/glow-zsh

The installed layout is:

    glow-zsh/
    ├── bin/
    │   └── glow-zsh
    ├── lib/
    │   └── core.zsh
    ├── config/
    │   └── config.zsh.example
    ├── _glow                    # generated Glow Zsh completion
    ├── glow-zsh.plugin.zsh
    ├── install.sh
    ├── uninstall.sh
    └── README.md

The plugin adds its own `bin/` directory to Zsh's `PATH` when Oh My Zsh loads it, so no separate `~/.local/bin` installation is required.

When Glow is available during installation, the installer also runs `glow completion zsh` and writes the generated `_glow` file into the managed plugin directory. Oh My Zsh adds enabled plugin directories to `fpath` before initializing completion, so no separate `compinit` configuration or `.zshrc` completion snippet is needed. If Glow is not available, installation continues and reports that completion was skipped; rerun the installer after installing Glow.

From the monorepo workspace:

    npm run plugin:install --workspace @moyarich/glow-zsh

The installer always prints the next steps: enable the plugin in `~/.zshrc`, reload the current shell with `source ~/.zshrc`, verify the command with `command -v glow-zsh`, and run a quick smoke test.

Installation is verbose by default and prints the resolved install mode, source package path, Oh My Zsh destination, and each copy/link operation.

For minimal output:

    npm run plugin:install:quiet --workspace @moyarich/glow-zsh

For development, use symlinks instead of copies:

    ./install.sh --symlink

or:

    npm run plugin:install:symlink --workspace @moyarich/glow-zsh

Verbose development install:

    npm run plugin:install:symlink:verbose --workspace @moyarich/glow-zsh

The symlink mode still creates the normal Oh My Zsh plugin directory, but its runtime files are symlinked back to the current checkout so code changes are immediately visible.

To uninstall either installation mode:

    npm run plugin:uninstall --workspace @moyarich/glow-zsh

The uninstaller removes symlinks directly and only removes copied plugin directories created by this installer. It refuses to recursively delete an unmanaged directory.

Reload Zsh so Oh My Zsh loads the plugin and adds its bundled `bin/` directory to `PATH`:

    source ~/.zshrc

Verify the CLI:

    command -v glow-zsh

The expected path is under:

    ${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/plugins/glow-zsh/bin/glow-zsh

## Enable the plugin

Add it to ~/.zshrc:

    plugins=(
      git
      glow-zsh
    )

Reload Zsh:

    source ~/.zshrc

Oh My Zsh discovers the plugin directly from:

    glow-zsh/
    ├── src/
    │   └── cli/
    │       └── glow-zsh.sh
    ├── lib/
    │   └── core.zsh
    ├── test/
    │   └── run-tests.zsh
    ├── glow-zsh.plugin.zsh
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

To prevent unusually large captured output from being sent through Glow, set `GLOW_ZSH_MAX_LENGTH` to a positive character count. Output beyond that limit is printed unchanged.

Example:

    printf '# Build Results\n\n| Package | Status |\n| --- | --- |\n| api | passing |\n'

## Configuration

Glow Zsh works without a config file. To see the path it would use:

    glow-zsh config-path

To create the config from the shipped, commented example and open it in your editor:

    glow-zsh config

The default path is:

    ${XDG_CONFIG_HOME:-$HOME/.config}/glow-zsh/config.zsh

Set `GLOW_ZSH_CONFIG_FILE` to use a different file. The config is sourced as Zsh, so it only needs to be readable; it does not need executable permissions. Existing config files are never overwritten.

Configuration precedence is:

    built-in defaults < config.zsh < pre-existing environment variables

The shipped example documents Glow Zsh settings such as `GLOW_ZSH_MAX_LENGTH`, `GLOW_ZSH_BYPASS_COMMANDS`, and `GLOW_ZSH_ARGS`.

Glow's own appearance and rendering settings remain owned by Glow. Use:

    glow config

Glow Zsh does not duplicate Glow's YAML settings. If `GLOW_ZSH_ARGS` is set, those values are passed directly to `glow` and may override corresponding Glow config values. No `.env` file is required or loaded.

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

    zsh src/cli/glow-zsh.sh -- printf '# Hello\n'

You can run normal commands through the source CLI while developing:

    zsh src/cli/glow-zsh.sh -- git status
    zsh src/cli/glow-zsh.sh -- python script.py
    zsh src/cli/glow-zsh.sh -- go test ./...

The source CLI shares its implementation with the Oh My Zsh plugin through `lib/core.zsh`.

## Build

`dist/` is the publishable runtime package. Source, tests, and development docs stay outside it.

Build the package:

    npm run build --workspace @moyarich/glow-zsh

The build assembles:

    dist/
    ├── bin/
    │   └── glow-zsh.sh
    ├── lib/
    │   └── core.zsh
    ├── config/
    │   └── config.zsh.example
    ├── glow-zsh.plugin.zsh
    ├── install.sh
    ├── uninstall.sh
    └── README.md

The shell CLI is copied from `src/cli/` into `dist/bin/` and made executable. The runtime library, plugin entry file, installer, and README are copied into `dist/`.

Only `dist/` is included in the package tarball.

You can validate the assembled runtime package with:

    npm run test:dist --workspace @moyarich/glow-zsh

## Development

Syntax-check the shell files and run the behavioral tests:

    zsh -n glow-zsh.plugin.zsh
    zsh -n lib/core.zsh
    zsh -n src/cli/glow-zsh.sh
    sh -n install.sh
    sh -n uninstall.sh
    zsh test/run-tests.zsh

From the dev-toolkit workspace, the same checks are available through:

    npm test --workspace @moyarich/glow-zsh

Or run only the behavioral shell tests:

    npm run test:shell --workspace @moyarich/glow-zsh

The tests exercise Markdown detection, bypass behavior, command output, exit-status preservation, ZLE command interoperability, the source shell CLI, and installer generation of Glow's native Zsh completion. `test:dist` validates the assembled `dist/` runtime package, including the generated CLI.

npm is only a monorepo development convenience. It is not required to install or run the plugin or CLI.

## Current limitation

The shell-native implementation captures command output before deciding whether to render it. Commands that rely heavily on interactive TTY behavior, live progress redraws, or full-screen terminal interfaces should be bypassed or run with the plugin disabled for that command.

## Troubleshooting plugin discovery

If Oh My Zsh reports:

```text
[oh-my-zsh] plugin 'glow-zsh' not found
```

but the installer reports that the plugin path already exists, the existing entry may be a stale or broken symlink.

Inspect it with:

```bash
ls -l "${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/plugins/glow-zsh"
```

Then rerun:

```bash
npm run plugin:install --workspace @moyarich/glow-zsh
```

The installer now defaults to a managed copy installation. If a stale symlink exists, the copy installer replaces it. It refuses to overwrite an unmanaged real directory.

Use `--symlink` only when you intentionally want the plugin connected to the working checkout.

After installation, verify the plugin entry file exists:

```bash
test -f "${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/plugins/glow-zsh/glow-zsh.plugin.zsh"
```

Then reload Zsh:

```bash
source ~/.zshrc
```
