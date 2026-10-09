# Changelog

## 0.1.0

### Added

- Reusable VS Code extension development and publishing tools.
- `vs-code-publish` CLI for packaging and publishing extensions.
- `run-extension-dev` CLI for launching local extension development environments.
- `run-vscode-tests` CLI for reusing a shared VS Code test download cache across extension repositories.
- Commander-based CLI handling and interactive prompts.
- Package-local getting-started, development, publishing, and CLI documentation.

### Changed

- Build VS Code extension helper CLIs into `dist/bin` and publish the built `dist/` output.
- Use `@moyarich/vite-plugin-package-bin` for executable package builds.
