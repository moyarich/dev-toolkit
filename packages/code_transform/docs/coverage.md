# Jest → Vitest migration coverage

The extended transform is intentionally additive to Codemod's upstream `jest/vitest` transform.

## Upstream coverage reviewed

The upstream codemod currently covers:

- global Jest test APIs such as `describe`, `it`, `test`, hooks, and `expect`
- `fit` → `it.only`
- `(it|test).failing` → `(it|test).fails`
- runtime `jest.*` → `vi.*`
- mappings such as `requireActual` → `importActual`
- `setMock` factory conversion
- default-export mock adjustments
- removal of `@jest/globals` imports
- snapshot syntax cleanup

## Extension coverage

The dev-toolkit extension adds coverage for gaps observed in real repositories:

- TypeScript Jest namespace types:
  - `jest.Mock`
  - `jest.Mocked<T>`
  - `jest.MockedClass<T>`
  - `jest.MockedFunction<T>`
  - `jest.MockedObject<T>`
  - supported `jest.Spied*` types
- leftover runtime `jest.*` calls in support files and manual mocks
- merging required runtime/type imports into existing `vitest` imports
- JavaScript and TypeScript source variants:
  - `.js`
  - `.jsx`
  - `.mjs`
  - `.cjs`
  - `.ts`
  - `.tsx`
- support files outside test directories, including `docs/**` and `bin/**`

## Migration audit coverage

The CLI audit fails when it finds:

- `jest`, `ts-jest`, or `@types/jest` dependencies
- package scripts still invoking Jest
- Jest-only `--runInBand`
- a remaining `jest.config.*`
- remaining `jest.*` namespace references
- no `vitest.config.*`
- a Vitest config without coverage configuration
- a Vitest config without coverage thresholds

The threshold check is deliberate: migrating the test runner should not silently weaken an existing Jest coverage gate.
