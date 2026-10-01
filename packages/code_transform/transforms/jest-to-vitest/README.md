# Jest to Vitest extended transform

This transform complements Codemod's existing `jest/vitest` migration.

It handles migration gaps that may remain in support files and manual mocks, including:

- `jest.fn()` and other remaining `jest.*` runtime calls → `vi.*`
- TypeScript Jest namespace types such as `jest.Mock` and `jest.Mocked<T>`
- required `vitest` runtime and type imports
- JavaScript and TypeScript files under normal source trees, `docs/**`, and `bin/**`

The transform is syntax-driven and is not limited to `__mocks__` directories.

## CLI

From the repository root:

```bash
npm run jest-to-vitest --workspace @moyarich/code-transform -- path/to/project
```

Or through the package bin:

```bash
npx jest-to-vitest-extended path/to/project
```

Audit an already-migrated repository without changing it:

```bash
npm run audit:jest-to-vitest --workspace @moyarich/code-transform -- path/to/project
```

The audit checks for remaining Jest dependencies, Jest scripts, `--runInBand`, Jest config, remaining `jest.*` references, Vitest configuration, coverage configuration, and coverage thresholds.

## Validate

```bash
npm run validate:jest-to-vitest --workspace @moyarich/code-transform
```

## Test

```bash
npm test --workspace @moyarich/code-transform
```

## Run the transform workflow directly

```bash
npx codemod workflow run \
  -w packages/code_transform/transforms/jest-to-vitest/workflow.yaml
```

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
