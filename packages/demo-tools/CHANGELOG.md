# Changelog

## 0.1.0

### Added

- Strategy-first demo authoring with typed `DemoStrategy` contracts and runtime validation.
- CLI discovery, listing, selection, and execution for independently addressable demo strategies.
- Browser, Playwright, browser-extension, VS Code, capture, recording, GIF, and process helpers.
- VS Code runtime and interaction adapters for extension demos.
- Reusable browser presentation helpers backed by `@moyarich/web-components`.
- Strategy generation, recording, code-generation, artifact-directory, and free-port utilities.
- Recursive strategy discovery with optional `fzf` selection.
- Package-local documentation for strategies, environments, recording, components, and CLI usage.

### Changed

- Organize source by feature and use strict TypeScript throughout the package.
- Build library exports into `dist/*.mjs` and CLI executables into `dist/bin`.
- Use the CLI as the strategy execution boundary and keep product-specific demo steps inside each strategy.

### Fixed

- Normalize recorded page actions and generated code syntax.
- Make browser launch, main-module detection, and typed Playwright/CDP interactions deterministic.
