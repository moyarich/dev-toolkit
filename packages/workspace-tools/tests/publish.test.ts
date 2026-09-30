import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";

const { execFileSync } = vi.hoisted(() => ({
  execFileSync: vi.fn(),
}));

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  execFileSync,
}));

import { packageGitTagState, serializePublishPlan } from "../src/publish.ts";

beforeEach(() => {
  vi.clearAllMocks();
});

test("serializePublishPlan returns stable machine-readable package metadata", () => {
  const plan = [
    {
      pkg: {
        directory: "packages/workspace-tools",
        manifest: {
          name: "@moyarich/workspace-tools",
          version: "0.1.2",
        },
      },
      registries: {
        github: "missing",
      },
    },
  ];

  assert.deepEqual(
    serializePublishPlan(plan, {
      registry: "github",
      tag: "latest",
      access: "public",
    }),
    {
      registry: "github",
      tag: "latest",
      access: "public",
      packages: [
        {
          name: "@moyarich/workspace-tools",
          version: "0.1.2",
          directory: "packages/workspace-tools",
          registries: {
            github: "missing",
          },
          publishable: true,
        },
      ],
    },
  );
});

test("serializePublishPlan marks fully published packages as not publishable", () => {
  const [pkg] = serializePublishPlan(
    [
      {
        pkg: {
          directory: "packages/workspace-tools",
          manifest: {
            name: "@moyarich/workspace-tools",
            version: "0.1.2",
          },
        },
        registries: {
          github: "published",
          npm: "published",
        },
      },
    ],
    {
      registry: "both",
      tag: "latest",
      access: "public",
    },
  ).packages;

  assert.equal(pkg.publishable, false);
});

test("serializePublishPlan preserves mixed registry readiness for dry-run reporting", () => {
  const result = serializePublishPlan(
    [
      {
        pkg: {
          directory: "packages/demo-tools",
          manifest: { name: "@moyarich/demo-tools", version: "0.1.0" },
        },
        registries: { github: "missing", npm: "published" },
      },
    ],
    { registry: "both", tag: "latest", access: "public" },
  );

  assert.equal(result.packages[0].publishable, true);
  assert.deepEqual(result.packages[0].registries, {
    github: "missing",
    npm: "published",
  });
});

test("packageGitTagState reports a missing package-scoped tag without invoking real Git", () => {
  execFileSync.mockImplementation(() => {
    throw new Error("unknown revision");
  });

  const state = packageGitTagState("/repo", {
    directory: "packages/workspace-tools",
    manifest: {
      name: "@moyarich/workspace-tools",
      version: "999.999.999",
    },
  });

  assert.deepEqual(state, {
    name: "workspace-tools@999.999.999",
    exists: false,
    atHead: false,
    commit: null,
  });
  assert.equal(execFileSync.mock.calls.length, 1);
  assert.deepEqual(execFileSync.mock.calls[0].slice(0, 2), [
    "git",
    ["rev-list", "-n", "1", "workspace-tools@999.999.999"],
  ]);
});

test("packageGitTagState compares an existing tag with HEAD using mocked Git", () => {
  execFileSync.mockReturnValueOnce("abc123\n").mockReturnValueOnce("abc123\n");

  const state = packageGitTagState("/repo", {
    directory: "packages/workspace-tools",
    manifest: {
      name: "@moyarich/workspace-tools",
      version: "1.2.3",
    },
  });

  assert.deepEqual(state, {
    name: "workspace-tools@1.2.3",
    exists: true,
    atHead: true,
    commit: "abc123",
  });
  assert.equal(execFileSync.mock.calls.length, 2);
});
