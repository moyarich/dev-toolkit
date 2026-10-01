# Jest to Vitest extended transform

This transform complements Codemod's existing `jest/vitest` migration.

It handles migration gaps that may remain in support files and manual mocks, including:

- `jest.fn()` and other remaining `jest.*` runtime calls → `vi.*`
- TypeScript Jest namespace types such as `jest.Mock` and `jest.Mocked<T>`
- required `vitest` runtime and type imports
- JavaScript and TypeScript files under normal source trees, `docs/**`, and `bin/**`

The transform is syntax-driven and is not limited to `__mocks__` directories.

## Usage

### Apply the migration

From the `dev-toolkit` repository:

```bash
npm run jest-to-vitest --workspace @moyarich/code-transform -- path/to/project
```

Or through the package bin:

```bash
npx jest-to-vitest-extended path/to/project
```

This runs:

1. the upstream `jest/vitest` codemod
2. the dev-toolkit extension transform
3. the migration audit

### Dry run

Preview the migration without modifying the source project:

```bash
npm run jest-to-vitest --workspace @moyarich/code-transform -- --dry-run path/to/project
```

or:

```bash
npx jest-to-vitest-extended --dry-run path/to/project
```

Dry-run behavior:

- copies the target project to a temporary directory
- runs the complete migration against the temporary copy
- prints a `git diff --no-index` preview
- runs the migration audit against the preview
- deletes the temporary copy
- leaves the source project unchanged

### Audit only

Check whether a repository has a complete Jest → Vitest migration without modifying files:

```bash
npm run audit:jest-to-vitest --workspace @moyarich/code-transform -- path/to/project
```

or:

```bash
npx jest-to-vitest-extended --audit-only path/to/project
```

The audit checks for:

- remaining `jest`, `ts-jest`, and `@types/jest` dependencies
- package scripts that still invoke Jest
- Jest-only `--runInBand`
- remaining `jest.config.*`
- remaining `jest.*` references
- missing `vitest.config.*`
- missing Vitest coverage configuration
- missing coverage thresholds

## Validate the codemod workflow

```bash
npm run validate:jest-to-vitest --workspace @moyarich/code-transform
```

## Test the transform

```bash
npm test --workspace @moyarich/code-transform
```

Fixtures currently cover:

- manual VS Code mocks
- Jest runtime APIs
- Jest TypeScript types
- files under `docs/**`
- files under `bin/**`

## Run the extension workflow directly

```bash
npx codemod workflow run \
  -w packages/code_transform/transforms/jest-to-vitest/workflow.yaml
```

Running the workflow directly executes only the dev-toolkit extension. Use the CLI entry point for the complete upstream + extension migration.

## Migration flow

1. run the standard `jest/vitest` codemod
2. run this extension transform
3. update package scripts and dependencies
4. migrate Jest configuration to Vitest configuration
5. preserve coverage include/exclude rules and thresholds
6. run coverage, lint, typecheck, build, integration tests, and packaging as appropriate

Project-specific runtime setup such as a VS Code `vscode` module alias belongs in the target project's Vitest configuration rather than the AST transform.

See:

- `../../docs/coverage.md` for the migration coverage matrix
- `../../docs/vscode-act-runner-local.md` for the real repository audit that motivated the extension
