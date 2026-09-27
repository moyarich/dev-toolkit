# Web components

The reusable browser elements live in `@moyarich/web-components`.

```text
packages/web-components/
├── docs/
├── src/
│   ├── caption/
│   ├── cursor-overlay/
│   └── magnifier-cursor-overlay/
└── package.json
```

The package owns the custom elements, styles, registration, and browser-facing component API. `@moyarich/demo-tools` owns automation adapters that install and control these elements from demos.

## Documentation

The extended documentation is written in MDX and organized for folder-based documentation ordering.

- [Documentation index](./docs/page.mdx)
- [Getting started](./docs/01-getting-started/page.mdx)
- [Caption overlay](./docs/02-components/01-caption-overlay/page.mdx)
- [Cursor overlay](./docs/02-components/02-cursor-overlay/page.mdx)
- [Magnifier cursor overlay](./docs/02-components/03-magnifier-cursor-overlay/page.mdx)
- [Package exports](./docs/03-reference/01-exports/page.mdx)

## Magnifier

The magnifier is a visual clone of the rendered content beneath the pointer. It preserves:

- computed styles, including Monaco and VS Code presentation
- live input, textarea, checkbox, and select state
- nested scroll positions
- 2D canvas pixels when they can be copied
- native text-selection highlighting
- visual updates caused by DOM mutations

Pointer, selection, mutation, scroll, and resize work is coalesced with animation frames so visual synchronization does not perform redundant work between browser frames.
