# Architecture

moyarich-auto-glow-md has two integration layers.

1. ZLE wrapper: the Oh My Zsh plugin wraps accept-line so commands can be routed transparently without aliasing individual executables.
2. PTY CLI: moyarich-auto-glow-md runs the command through node-pty, preserving TTY behavior while inspecting terminal-facing output.

## Flow

    ZLE accept-line
          |
          v
    moyarich-auto-glow-md
          |
          v
       node-pty
          |
          v
       command
          |
          +-- ordinary output --------> terminal
          |
          +-- Markdown detected -> glow -> terminal

Shell-state commands such as cd, export, source, and alias bypass the PTY so their effects remain in the current shell.

The Markdown classifier is deliberately conservative and currently recognizes headings, fenced code blocks, and Markdown tables.
