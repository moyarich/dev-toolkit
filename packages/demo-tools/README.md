# @moyarich/demo-tools

Strategy-first tooling for automated demos.

The central rule is: **a strategy owns its demo**.

A consuming repository uses:

```text
demo/
├── artifacts/
└── strategies/
    ├── overview/
    │   ├── index.mjs
    │   ├── fixture.html
    │   └── helpers.mjs
    └── advanced-workflow/
        ├── index.mjs
        └── workspace/
```

Each strategy is independently addressable. It owns its setup, actions, fixtures,
assertions, screenshots, recordings, and cleanup. It may explicitly import
shared utilities when behavior is genuinely reusable.

```js
import { executableDemoStrategy } from "@moyarich/demo-tools";
import { pause } from "@moyarich/demo-tools/utils";

export default executableDemoStrategy({
  name: "overview",
  description: "Show the primary product workflow.",

  async run({ artifactsDirectory }) {
    // Start or connect to the environment needed by this strategy.
    // Use Playwright, VS Code automation, a browser extension, etc.
    // Write screenshots/recordings to artifactsDirectory.
    await pause(250);
  },
});
```

Run a strategy directly — this is the primary execution model:

```sh
node demo/strategies/overview/index.mjs
```

Importing that same strategy for discovery does not execute it. Its default artifact directory is local to the strategy:

```text
demo/strategies/overview/artifacts/
```

The CLI remains an optional convenience for batch execution.

Run all strategies:

```sh
demo run
```

Run one or more:

```sh
demo run --strategy=overview
demo run --strategy=overview,advanced-workflow
```

Discover them:

```sh
demo list
```

Use a different strategy root when needed:

```sh
demo run --strategies=path/to/demo/strategies
```

## Architecture

`@moyarich/demo-tools` owns orchestration primitives: discovery, selection,
artifact directories, process helpers, and the strategy contract.

It intentionally does **not** put product-specific steps into a central runner.
Browser, Playwright, VS Code, browser-extension, screenshot, and recording
support can be exposed as explicit reusable adapters/utilities while strategies
remain the owner of the demo story.

This structure is intended to absorb the reusable infrastructure proven in
`pointer-bubble`, `element-inspector`, and `JotebookSync` without coupling
their product-specific behavior.


## Documentation

The extended documentation is written in MDX so documentation sites can add interactive examples and components without changing the package documentation source.

- [Documentation index](./docs/page.mdx)
- [Strategies](./docs/02-guides/01-strategies/page.mdx)
- [CLI and discovery](./docs/04-reference/01-cli/page.mdx)
- [Browser and browser-extension demos](./docs/03-environments/01-browser/page.mdx)
- [VS Code demos](./docs/03-environments/02-vscode/page.mdx)
- [Recording and media](./docs/02-guides/02-recording/page.mdx)
- [Demo components](./docs/02-guides/03-components/page.mdx)
