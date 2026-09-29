import assert from "node:assert/strict";
import test from "node:test";

import { packageGitTagState, serializePublishPlan } from "../src/publish.mts";

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


test("packageGitTagState reports the expected package-scoped tag name", () => {
  const state = packageGitTagState(process.cwd(), {
    directory: "packages/workspace-tools",
    manifest: {
      name: "@moyarich/workspace-tools",
      version: "999.999.999",
    },
  });

  assert.equal(state.name, "workspace-tools@999.999.999");
  assert.equal(state.exists, false);
  assert.equal(state.atHead, false);
  assert.equal(state.commit, null);
});
