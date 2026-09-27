import assert from "node:assert/strict";
import test from "node:test";
import { parseReleaseArgument } from "../src/release.mjs";
import { packageInfo } from "../src/workspace.mjs";

test("parseReleaseArgument accepts bump names", () => {
  assert.deepEqual(parseReleaseArgument("demo-tools=patch"), {
    selector: "demo-tools",
    versionSpec: "patch",
  });
});

test("parseReleaseArgument accepts explicit semver", () => {
  assert.deepEqual(parseReleaseArgument("demo-tools=1.2.3-beta.1"), {
    selector: "demo-tools",
    versionSpec: "1.2.3-beta.1",
  });
});

test("parseReleaseArgument rejects malformed input and versions", () => {
  assert.throws(() => parseReleaseArgument("demo-tools"), /Usage:/);
  assert.throws(() => parseReleaseArgument("demo-tools=banana"), /Invalid version/);
});

test("packageInfo rejects selectors that can escape packages", () => {
  assert.throws(() => packageInfo(process.cwd(), "../demo-tools"), /Package selector/);
  assert.throws(() => packageInfo(process.cwd(), "demo/tools"), /Package selector/);
});
