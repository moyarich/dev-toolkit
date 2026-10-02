# Changelog

## Unreleased

### Changed

- Build the CLI into `dist/bin` and package the built `dist/` output instead of TypeScript source.

## 0.1.0

### Added

- Self-contained Jest to Vitest codemod.
- Runtime Jest API migration to Vitest equivalents.
- TypeScript Jest namespace type migration.
- Codemod workflow validation and migration audit support.
- Dry-run support for previewing migrations without changing the source repository.
- CLI packaging through `@moyarich/vite-plugin-package-bin`.
- Documentation, fixtures, and reusable Codemod Registry publishing workflow support.
