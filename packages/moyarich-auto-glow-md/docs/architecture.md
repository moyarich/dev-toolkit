# Architecture

moyarich-auto-glow-md is a shell-native Oh My Zsh plugin.

It runs directly from Zsh and depends on Glow for Markdown rendering. There is no Node.js runtime, generated JavaScript CLI, or node-pty layer.

## Flow

    ZLE accept-line
          |
          +-- shell-state command -----------> normal Zsh execution
          |
          +-- other command
                 |
                 +-- capture command output
                 |
                 +-- Markdown detected -> glow
                 |
                 +-- otherwise -> print unchanged

The plugin bypasses commands that must modify the current shell, such as cd, export, source, alias, setopt, pushd, jobs, fg, bg, exec, and exit.

## Oh My Zsh entry point

Oh My Zsh loads the package directly through:

    moyarich-auto-glow-md.plugin.zsh

The plugin directory can therefore be symlinked directly into:

    $ZSH_CUSTOM/plugins/moyarich-auto-glow-md

## Tradeoff

The shell-native implementation captures output before classifying it. This keeps installation and runtime dependencies minimal, but it is less suitable for commands that require continuous TTY streaming or full-screen terminal behavior.
