# vscode-act-runner-local migration audit

Repository reviewed: `moyarich/vscode-act-runner-local`.

Workflow run reviewed: `36925062784`.

## What the run proved

The migration reached Vitest successfully. Nine of fourteen unit-test files passed before validation stopped.

The remaining five suites failed because the shared manual VS Code mock still contained `jest.fn()`, producing:

```text
ReferenceError: jest is not defined
```

That is the regression case covered by the extended transform.

## Configuration parity still required

The repository's Jest configuration contains behavior that must be preserved in Vitest:

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

The current Vitest configuration only selects the V8 provider. A complete migration must also carry over the coverage include/exclude rules and thresholds.

Equivalent Vitest intent:

```ts
coverage: {
  provider: "v8",
  include: ["src/core/**/*.ts", "src/providers/**/*.ts"],
  exclude: ["src/**/*.test.ts", "src/__mocks__/**"],
  thresholds: {
    lines: 49,
    functions: 46,
  },
}
```

## Completion checklist

A migration is not complete until all of the following are true:

- unit tests run with Vitest
- VS Code integration tests remain under the Extension Host runner
- the `vscode` unit-test alias points to the manual mock
- manual mocks contain no Jest globals
- Jest dependencies are removed
- Jest-only CLI flags are removed
- `jest.config.*` is removed
- Vitest coverage include/exclude rules preserve Jest intent
- Vitest coverage thresholds preserve or strengthen the prior gate
- lint passes
- typecheck passes
- extension builds pass
- Extension Host smoke test passes
- VSIX packaging passes
