# Changelog

## 0.1.0

### Added

- Self-contained Jest to Vitest codemod with Codemod Registry metadata and workflow support.
- Runtime Jest API migration to Vitest equivalents, including timer and timeout semantics.
- TypeScript Jest namespace and `SpyInstance` migration support.
- Project-level migration helpers for Jest configuration, scripts, coverage thresholds, and dependencies.
- Playwright guards so Playwright test suites are not rewritten as Vitest tests.
- Migration audit and dry-run workflows.
- Semantic Jest-to-Vitest mapping helpers, reports, and extensive JSSG/unit fixtures.
- Package documentation and end-to-end migration guidance.

### Changed

- Build the CLI into `dist/bin` and publish the built `dist/` output.
- Separate unit tests from JSSG transform tests for clearer validation.
- Package the registry metadata and documentation required to run the codemod independently.

### Fixed

- Preserve variadic Jest arguments and asynchronous Jest import APIs.
- Parse Jest coverage thresholds safely.
- Match Jest calls and types structurally and normalize watch-mode migration.
- Load JSSG virtual-module types correctly under strict TypeScript.
