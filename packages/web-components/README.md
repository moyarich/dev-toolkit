# Web components

The reusable browser elements live in `@moyarich/web-components`.

```text
packages/web-components/
├── src/
│   ├── caption/
│   ├── cursor-overlay/
│   └── magnifier-cursor-overlay/
└── package.json
```

`@moyarich/demo-tools` keeps the automation adapters that install these elements into Playwright and VS Code pages. Its existing component entry points re-export the extracted elements for compatibility.

## Magnifier

The magnifier is a visual clone of the rendered content beneath the pointer. It preserves:

- computed styles, including Monaco and VS Code presentation
- live input, textarea, checkbox, and select state
- nested scroll positions
- 2D canvas pixels when they can be copied
- native text-selection highlighting
- visual updates caused by DOM mutations

Pointer, selection, mutation, scroll, and resize work is coalesced with animation frames so visual synchronization does not perform redundant work between browser frames.
