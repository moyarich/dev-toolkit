# moyarich-auto-glow-md

Shell-native Oh My Zsh plugin that automatically renders Markdown-looking command output with Glow.

The plugin does not require Node.js, npm, node-pty, a compiled CLI, or a generated bin directory at runtime.

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

Link the package directly into the Oh My Zsh custom plugin directory:

    ln -s \
      "${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/dev-toolkit/packages/moyarich-auto-glow-md" \
      "${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/plugins/moyarich-auto-glow-md"

Or run the included shell installer:

    cd "${ZSH_CUSTOM:-${HOME}/.oh-my-zsh/custom}/dev-toolkit/packages/moyarich-auto-glow-md"
    ./install.sh

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

The `bin/` directory is generated output and is not the source location.

Build the package:

    npm run build --workspace @moyarich/auto-glow-md

The Vite package-bin plugin copies:

    src/cli/moyarich-auto-glow-md.sh

to:

    bin/moyarich-auto-glow-md.sh

and makes the generated file executable.

You can test the generated CLI with:

    npm run test:built-cli --workspace @moyarich/auto-glow-md

## Development

Syntax-check the shell files and run the behavioral tests:

    zsh -n moyarich-auto-glow-md.plugin.zsh
    zsh -n lib/core.zsh
    zsh -n src/cli/moyarich-auto-glow-md.sh
    sh -n install.sh
    zsh test/run-tests.zsh

From the dev-toolkit workspace, the same checks are available through:

    npm test --workspace @moyarich/auto-glow-md

Or run only the behavioral shell tests:

    npm run test:shell --workspace @moyarich/auto-glow-md

The tests exercise Markdown detection, bypass behavior, command output, exit-status preservation, and the source shell CLI. The build-specific test verifies the generated `bin/moyarich-auto-glow-md.sh` command.

npm is only a monorepo development convenience. It is not required to install or run the plugin or CLI.

## Current limitation

The shell-native implementation captures command output before deciding whether to render it. Commands that rely heavily on interactive TTY behavior, live progress redraws, or full-screen terminal interfaces should be bypassed or run with the plugin disabled for that command.
