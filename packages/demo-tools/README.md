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
import { defineDemoStrategy } from "@moyarich/demo-tools";
import { pause } from "@moyarich/demo-tools/utils";

export default defineDemoStrategy({
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
