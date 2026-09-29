# Changelog

## 0.1.2

### Changed

- Package release.

## 0.1.1

### Added

- color release preview output
- protect private workspaces from release
- protect private workspaces from publishing
- check dependencies before release
- check dependencies before publish
- add shared dependency checks
- confirm interactive releases
- confirm interactive publishing
- report registry publish state
- compose list and dry run
- add publish plan listing
- publish workspace dependencies first
- add dependency publish option
- resolve publish dependency order
- resolve workspace selectors
- prepare package release
- verify versions against package registry
- expose dry-run CLI flag
- add non-mutating dry run
- generate package changelog
- align workspace publishing behavior
- migrate reusable release tooling

### Changed

- updaded workflow
- use Commander for publish CLI
- allow configured workspace paths
- cover manifest workspace discovery
- derive workspace locations from manifest
- cover dependency checks
- expose dependency classification
- document publish listing
- document dependency publishing
- cover dependency publish option
- verify categorized release notes
- generate useful package release notes
- cover changelog section
- document reusable release workflow
- cover release parsing and selector safety
- expose release argument parser
- add package-local MoyaForge MDX guides
- cover workspace release helpers
- scaffold reusable dev toolkit

### Fixed

- clarify release preview version
- clean release dry-run output
- reject unsafe package selectors
- keep package install tree clean
- expose release version modes
- distinguish unpublished packages from registry errors
- resolve previous package release reliably

## 0.1.0

### Added

- Workspace-aware package release and publishing commands.
- Release modes for npm version bumps, exact SemVer releases, and the current package version.
- Non-mutating release dry runs with registry and changelog previews.
- Package-scoped changelog generation for releases.
- GitHub Packages and npm publishing support.
