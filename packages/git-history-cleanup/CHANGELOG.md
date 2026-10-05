# Changelog

## 0.1.0

### Initial Release

- Find historical files and directories with `git-history-cleanup --find <file-or-folder>` and multi-select matching paths.
- Inspect the largest reachable historical Git blobs.
- Browse reachable history as a virtual filesystem.
- Show aggregate historical size, largest blob, and blob count per path.
- Multi-select historical files and directories for removal.
- Collapse redundant descendant selections beneath selected directories.
- Remove multiple paths with one `git filter-repo` invocation.
- Verify removed paths, repack rewritten history, and optionally force-push refs.
