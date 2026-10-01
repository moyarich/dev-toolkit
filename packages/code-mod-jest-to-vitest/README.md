# Jest to Vitest transform

This is a self-contained Jest → Vitest codemod for `dev-toolkit`.

It incorporates the migration behaviors reviewed from Codemod's `jest/vitest` implementation and adds the TypeScript and repository-level coverage needed by real projects such as `vscode-act-runner-local`.

It handles:

- Jest globals such as `describe`, `it`, `test`, hooks, and `expect`
- `fit` → `it.only`
- `(it|test).failing` → `(it|test).fails`
- `jest.*` runtime APIs → `vi.*`
- API renames such as:
  - `requireActual` → `importActual`
  - `requireMock` → `importMock`
  - `createMockFromModule` → `importMock`
  - `genMockFromModule` → `importMock`
  - `setMock` → `mock`
  - `deepUnmock` → `unmock`
- removal of `@jest/globals` imports
- TypeScript Jest namespace types such as `jest.Mock` and `jest.Mocked<T>`
- snapshot syntax cleanup for legacy `Array [` and `Object {` output
- JavaScript and TypeScript files under normal source trees, `docs/**`, and `bin/**`

The transform is syntax-driven and is not limited to test files or `__mocks__` directories.

## Usage

### Apply the migration

From the `dev-toolkit` repository:

```bash
npm run jest-to-vitest --workspace @moyarich/code-mod-jest-to-vitest -- path/to/project
```

Or through the package bin:

```bash
npx jest-to-vitest path/to/project
```

This runs the local `packages/code-mod-jest-to-vitest/workflow.yaml` and then performs the migration audit.

There is no dependency on the external `jest/vitest` codemod package.

### Dry run

Preview the migration without modifying the source project:

```bash
npm run jest-to-vitest --workspace @moyarich/code-mod-jest-to-vitest -- --dry-run path/to/project
```

or:

```bash
npx jest-to-vitest --dry-run path/to/project
```

Dry-run behavior:

- copies the target project to a temporary directory
- runs the complete local migration against the temporary copy
- prints a `git diff --no-index` preview
- runs the migration audit against the preview
- deletes the temporary copy
- leaves the source project unchanged

### Audit only

Check whether a repository has a complete Jest → Vitest migration without modifying files:

```bash
npm run audit:jest-to-vitest --workspace @moyarich/code-mod-jest-to-vitest -- path/to/project
```

or:

```bash
npx jest-to-vitest --audit-only path/to/project
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
npm run validate --workspace @moyarich/code-mod-jest-to-vitest
```

## Test the transform

```bash
npm test --workspace @moyarich/code-mod-jest-to-vitest
```

Fixtures currently cover:

- manual VS Code mocks
- Jest runtime APIs
- Jest TypeScript types
- files under `docs/**`
- files under `bin/**`

## Run with Codemod CLI

```bash
npx codemod workflow validate \
  -w packages/code-mod-jest-to-vitest/workflow.yaml
```

```bash
npx codemod workflow run \
  -w packages/code-mod-jest-to-vitest/workflow.yaml
```

That workflow is the complete AST migration; it no longer delegates to another Jest → Vitest codemod.

## Migration flow

1. run the local Jest → Vitest AST transform
2. update package scripts and dependencies
3. migrate Jest configuration to Vitest configuration
4. preserve coverage include/exclude rules and thresholds
5. run coverage, lint, typecheck, build, integration tests, and packaging as appropriate

Project-specific runtime setup such as a VS Code `vscode` module alias belongs in the target project's Vitest configuration rather than the AST transform.

See:

- `./docs/coverage.md` for the migration coverage matrix
- `./docs/vscode-act-runner-local.md` for the real repository audit that motivated the implementation


## Build

This package follows the same build convention as `packages/vs-code-ext-tools`:

```bash
npm run build --workspace @moyarich/code-mod-jest-to-vitest
npm run typecheck --workspace @moyarich/code-mod-jest-to-vitest
npm test --workspace @moyarich/code-mod-jest-to-vitest
```

The CLI source lives at `src/cli/jest-to-vitest.ts`. Vite uses `@moyarich/vite-plugin-package-bin` to generate `bin/jest-to-vitest.mjs`.
