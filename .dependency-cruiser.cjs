/**
 * Dependency Cruiser rules for the dev-toolkit monorepo.
 *
 * CI runs these rules across both packages/ and apps/.
 *
 * Error rules are intentionally limited to high-signal failures that should
 * block a change. Noisier architecture smells remain warnings until the repo
 * has been tuned against them.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment:
        "Circular module dependencies make package behavior and build order harder to reason about.",
      severity: "error",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "no-unresolved",
      comment: "Every imported module should resolve successfully in CI.",
      severity: "error",
      from: {
        // VS Code injects the `vscode` module into the extension host runtime.
        pathNot: "^packages/demo-tools/src/vscode/extension-host[.]cjs$",
      },
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: "no-undeclared-package-dependencies",
      comment: "Imported npm packages must be declared by the owning package.",
      severity: "error",
      from: {},
      to: {
        dependencyTypes: ["npm-no-pkg", "npm-unknown"],
      },
    },
    {
      name: "no-production-to-tests",
      comment: "Production modules should not depend on test-only modules.",
      severity: "warn",
      from: {
        path: "^(packages|apps)/.+/(src|bin|lib)/",
      },
      to: {
        path: "(^|/)(tests?|__tests__)/|[.](spec|test)[.][cm]?[jt]sx?$",
      },
    },
    {
      name: "no-cross-package-internals",
      comment:
        "Workspace packages should consume another package through its public API instead of reaching into another package's internals.",
      severity: "warn",
      from: {
        path: "^packages/([^/]+)/",
      },
      to: {
        path: "^packages/([^/]+)/(src|tests?)/",
        pathNot: "^packages/$1/",
      },
    },
    {
      name: "no-orphans",
      comment: "Orphan modules can indicate dead code or incomplete refactors.",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)[.][^/]+[.](js|cjs|mjs|ts|json)$",
          "[.]d[.][cm]?ts$",
          "(^|/)vite[.]config[.][cm]?[jt]s$",
          "(^|/)vitest[.]config[.][cm]?[jt]s$",
          "(^|/)eslint[.]config[.][cm]?[jt]s$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: [
      "(^|/)(dist|coverage|node_modules)/",
      "(^|/)fixtures?/",
      "(^|/)mocks?/",
    ],
    moduleSystems: ["es6", "cjs"],
    tsPreCompilationDeps: true,
  },
};
