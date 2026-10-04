# Changelog

## 0.1.0

### Added

- Optional XDG-aware `config.zsh` with a shipped commented example, config CLI commands, environment precedence, and raw Glow argument passthrough.

- Automatic installation of Glow's native Zsh completion into the managed Oh My Zsh plugin directory when Glow is available.
- Installer coverage verifying that `glow completion zsh` produces the `_glow` completion file.

- Shell-native Oh My Zsh plugin that detects Markdown-like command output and renders it through Glow.
- Bundled CLI for running commands through the same Markdown detection and rendering pipeline.
- Safe bypass rules for shell-state commands such as `cd`, `source`, `export`, aliases, job control, and shell exit.
- Internal recursion guard so child shells do not re-wrap commands.
- Managed copy and symlink installation modes for Oh My Zsh development and normal use.
- Installer guidance for enabling the plugin, reloading Zsh, verifying the CLI, and running a smoke test.
- Source, behavioral, distributable-package, and real Glow integration tests.
- Package-local getting-started, architecture, and testing documentation.

### Changed

- Use a shell-native runtime with no Node.js requirement after installation.
- Build the publishable runtime into `dist/`, including the plugin entry point, CLI, runtime library, installer, uninstaller, and README.

### Safety

- Refuse to recursively remove unmanaged plugin directories during uninstall.
- Keep shell-state commands out of the output-capture path.
