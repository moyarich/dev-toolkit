import assert from "node:assert/strict";
import test from "node:test";
import { changelogSection, parseReleaseArgument, releaseNotes } from "../src/release.mjs";
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

test("releaseNotes groups package changes for consumers", () => {
  assert.deepEqual(
    releaseNotes([
      "feat(parser): support relative colors",
      "fix: preserve alpha values",
      "refactor: simplify tokenizer",
      "release: parser@1.2.2",
    ]),
    {
      Added: ["support relative colors"],
      Changed: ["simplify tokenizer"],
      Fixed: ["preserve alpha values"],
      Removed: [],
    },
  );
});

test("changelogSection renders release-note categories", () => {
  assert.equal(
    changelogSection("1.2.3", {
      Added: ["support relative colors"],
      Changed: [],
      Fixed: ["preserve alpha values"],
      Removed: [],
    }),
    "## 1.2.3\n\n### Added\n\n- support relative colors\n\n### Fixed\n\n- preserve alpha values\n",
  );
});
