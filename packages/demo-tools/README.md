# @moyarich/demo-tools

Strategy-first tooling for automated demos.

The central rule is: **a strategy owns its demo**.

A consuming TypeScript repository can use:

```text
demo/
├── artifacts/
└── strategies/
    ├── overview/
    │   ├── index.ts
    │   ├── fixture.html
    │   └── helpers.ts
    └── advanced-workflow/
        ├── index.ts
        └── workspace/
```

Each strategy is independently addressable. It owns its setup, actions, fixtures,
assertions, screenshots, recordings, and cleanup. It may explicitly import
shared utilities when behavior is genuinely reusable.

```ts
import type { DemoStrategy } from "@moyarich/demo-tools";
import { pause } from "@moyarich/demo-tools/utils";

const strategy = {
  name: "overview",
  description: "Show the primary product workflow.",

  async run({ artifactsDirectory }) {
    // Start or connect to the environment needed by this strategy.
    // Use Playwright, VS Code automation, a browser extension, etc.
    // Write screenshots/recordings to artifactsDirectory.
    await pause(250);
  },
} satisfies DemoStrategy;

export default strategy;
```

`DemoStrategy` is the authoring contract. Use `satisfies DemoStrategy` for
compile-time checking without wrapping or freezing the strategy. Dynamically
loaded strategies are validated by demo-tools at the runtime boundary.

Strategies are executed through the CLI, which owns discovery, runtime validation, and execution.

```sh
demo run
demo run overview
demo run overview advanced-workflow
demo list
demo --strategies=path/to/demo/strategies run
```

## Architecture

`@moyarich/demo-tools` owns orchestration primitives: discovery, selection,
artifact directories, process helpers, runtime strategy validation, and the
strategy type contract.

It intentionally does **not** put product-specific steps into a central runner.
Browser, Playwright, VS Code, browser-extension, screenshot, and recording
support can be exposed as explicit reusable adapters/utilities while strategies
remain the owner of the demo story.

## Documentation

- [Documentation index](./docs/page.mdx)
- [Strategies](./docs/02-guides/01-strategies/page.mdx)
- [CLI and discovery](./docs/04-reference/01-cli/page.mdx)
- [Stacked pull requests](./docs/04-reference/02-stacked-pull-requests/page.mdx)
- [Browser and browser-extension demos](./docs/03-environments/01-browser/page.mdx)
- [VS Code demos](./docs/03-environments/02-vscode/page.mdx)
- [Recording and media](./docs/02-guides/02-recording/page.mdx)
- [Presentation adapters](./docs/02-guides/03-components/page.mdx)
