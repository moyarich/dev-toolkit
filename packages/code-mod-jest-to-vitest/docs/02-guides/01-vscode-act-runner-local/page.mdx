# vscode-act-runner-local migration

Repository: `moyarich/vscode-act-runner-local`

This repository is the concrete migration case that motivated `@moyarich/code-mod-jest-to-vitest`.

## Why this repository matters

An earlier Jest → Vitest migration reached Vitest successfully, but five unit-test suites still failed because the shared manual VS Code mock contained `jest.fn()`.

The failure was:

```text
ReferenceError: jest is not defined
```

The repository also contained TypeScript Jest namespace types such as:

```ts
jest.Mock
jest.Mocked<T>
jest.MockedFunction<T>
```

Those cases are now explicitly covered by the codemod.

## Run the migration

### From the Codemod Registry

Once published:

```bash
cd vscode-act-runner-local

npx codemod @moyarich/code-mod-jest-to-vitest
```

### From the dev-toolkit workspace

When developing the codemod locally:

```bash
cd dev-toolkit

npm run jest-to-vitest \
  --workspace @moyarich/code-mod-jest-to-vitest \
  -- ../vscode-act-runner-local
```

### Dry run first

Preview the migration without changing the repository:

```bash
npm run jest-to-vitest \
  --workspace @moyarich/code-mod-jest-to-vitest \
  -- --dry-run ../vscode-act-runner-local
```

The dry run:

1. copies the target repository to a temporary directory
2. runs the complete migration there
3. prints the resulting diff
4. audits the migrated copy
5. deletes the temporary directory
6. leaves `vscode-act-runner-local` unchanged

### Audit only

To check whether the repository is fully migrated without changing files:

```bash
npm run audit \
  --workspace @moyarich/code-mod-jest-to-vitest \
  -- ../vscode-act-runner-local
```

## What the codemod must change

### Runtime Jest APIs

The shared VS Code mock originally contained calls such as:

```ts
jest.fn()
```

They must become:

```ts
vi.fn()
```

with the required import:

```ts
import { vi } from "vitest";
```

### TypeScript Jest namespace types

Code such as:

```ts
(vscode.window.showWarningMessage as jest.Mock)
```

must become:

```ts
(vscode.window.showWarningMessage as Mock)
```

with:

```ts
import type { Mock } from "vitest";
```

The same applies to supported Jest types including:

```text
jest.Mock
jest.Mocked
jest.MockedClass
jest.MockedFunction
jest.MockedObject
jest.Spied*
```

### Jest-only scripts

The original package scripts included Jest commands and flags such as:

```text
jest
jest --watch
jest --coverage
--runInBand
```

A complete migration must remove those Jest-only commands and flags.

## Preserve VS Code integration tests

The repository has two different test environments:

```text
Unit tests
    ↓
Vitest

VS Code Extension Host integration tests
    ↓
vscode-test
```

The integration suite under `test/integration/` must remain under the VS Code Extension Host runner.

The Vitest configuration should continue to limit unit tests to the intended source tree, for example:

```ts
test: {
  include: ["src/**/*.test.ts"],
}
```

This prevents the migration from accidentally treating Extension Host tests as Vitest tests.

## Preserve the vscode module mock

Unit tests rely on a `vscode` alias pointing to:

```text
src/__mocks__/vscode.ts
```

The Vitest configuration needs to preserve that alias:

```ts
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      vscode: resolve(__dirname, "src/__mocks__/vscode.ts"),
    },
  },
});
```

This runtime configuration belongs in the target project's Vitest config rather than in the generic AST transform.

## Preserve coverage behavior

The Jest configuration contained:

```text
collectCoverageFrom:
  src/core/**/*.ts
  src/providers/**/*.ts
  !src/**/*.test.ts
  !src/__mocks__/**

coverageThreshold:
  global.lines = 49
  global.functions = 46
```

The migration must preserve that intent.

Equivalent Vitest configuration:

```ts
coverage: {
  provider: "v8",
  include: [
    "src/core/**/*.ts",
    "src/providers/**/*.ts",
  ],
  exclude: [
    "src/**/*.test.ts",
    "src/__mocks__/**",
  ],
  thresholds: {
    lines: 49,
    functions: 46,
  },
}
```

Migrating the runner should not silently weaken the existing coverage gate.

## Dependencies

A completed migration should no longer contain:

```text
jest
ts-jest
@types/jest
```

and should have the required Vitest dependencies, including the V8 coverage provider when coverage is enabled.

## Migration audit

The codemod audit checks for:

- remaining `jest`, `ts-jest`, or `@types/jest` dependencies
- scripts that still invoke Jest
- remaining `--runInBand`
- remaining `jest.config.*`
- remaining `jest.*` references
- missing `vitest.config.*`
- missing coverage configuration
- missing coverage thresholds

The audit intentionally catches repository-level migration work that an AST replacement alone cannot prove complete.

## Validation after migration

Run the repository's normal checks after the codemod:

```bash
npm run test:coverage
npm run lint
npm run typecheck
npm run build
npm run test:integration
```

If the extension has a packaging check, also build the VSIX.

## Completion checklist

The migration is complete when:

- unit tests run with Vitest
- all unit-test suites pass
- VS Code integration tests remain under the Extension Host runner
- the `vscode` unit-test alias points to the manual mock
- manual mocks contain no Jest globals
- TypeScript code contains no Jest namespace types
- Jest dependencies are removed
- Jest-only CLI flags are removed
- `jest.config.*` is removed
- Vitest coverage include/exclude rules preserve Jest intent
- Vitest coverage thresholds preserve or strengthen the prior gate
- lint passes
- typecheck passes
- extension builds pass
- Extension Host tests pass
- VSIX packaging passes

## Why this case is kept as documentation

`vscode-act-runner-local` is useful as a regression target because it exercises migration cases that are easy to miss:

```text
ordinary unit tests
+ shared manual mocks
+ Jest TypeScript namespace types
+ VS Code module aliasing
+ separate Extension Host tests
+ coverage thresholds
+ repository-level npm scripts
```

The fixtures in `packages/code-mod-jest-to-vitest/tests/fixtures/` should continue to represent these behaviors so future changes to the codemod do not regress this migration.
