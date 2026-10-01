# Jest to Vitest extended transform

This transform complements Codemod's existing `jest/vitest` migration.

It handles migration gaps that may remain in support files and manual mocks, including:

- `jest.fn()` and other remaining `jest.*` runtime calls → `vi.*`
- TypeScript Jest namespace types such as `jest.Mock` and `jest.Mocked<T>`
- required `vitest` runtime and type imports

The transform is syntax-driven and is not limited to `__mocks__` directories.

## Validate

```bash
npm run validate:jest-to-vitest --workspace @moyarich/code-transform
```

## Test

```bash
npm test --workspace @moyarich/code-transform
```

## Run the workflow

```bash
npx codemod workflow run \
  -w packages/code_transform/transforms/jest-to-vitest/workflow.yaml
```

The intended migration flow is:

1. run the standard `jest/vitest` codemod
2. run this extension transform
3. update package scripts and dependencies
4. add project-specific Vitest configuration when required
5. run coverage, lint, typecheck, and build

Project-specific configuration such as a VS Code `vscode` module alias should remain outside this AST transform.
