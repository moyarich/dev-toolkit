# Changelog

## 0.1.0

### Added

- Build the CLI into `dist/bin` and package the built `dist/` output.

- Add the `vscode-test-clean` CLI for discovering and removing VS Code test environments created by `@vscode/test-electron`.
- Discover nested `.vscode-test` directories from a configurable root while skipping `.git` and `node_modules`.
- Report per-cache and total disk usage before cleanup.
- Add automatic `fzf` multi-select when stdin/stdout are attached to a TTY and `fzf` is available.
- Add `--root`, `--all`, `--json`, `--dry-run`, `--yes`, and `--no-fzf` CLI options.
- Add confirmation prompts for destructive cleanup unless `--yes` is explicitly supplied.
- Support Docker and CI through explicit non-interactive modes.
- Export reusable discovery, size formatting, safe deletion, and fzf capability helpers.
- Add Vitest coverage for cache discovery, ignored directories, dry runs, deletion safety, fzf capability detection, and size formatting.

### Safety

- Restrict deletion to exact paths returned by cache discovery.
- Keep `--json` and `--dry-run` non-destructive.
- Do not follow arbitrary fzf output directly into file deletion.

