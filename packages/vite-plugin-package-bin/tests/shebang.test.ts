import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { standaloneCliBuilds } from "../src/packageBinBuild.ts";

test("adds a Node shebang only when the source is missing one", async () => {
  const root = await mkdtemp(join(tmpdir(), "package-bin-build-"));

  try {
    const withShebang = join(root, "with-shebang.ts");
    const withoutShebang = join(root, "without-shebang.ts");
    await writeFile(withShebang, "#!/usr/bin/env node\nconsole.log('with');\n");
    await writeFile(withoutShebang, "console.log('without');\n");

    const builds = standaloneCliBuilds(
      {
        "with-shebang": withShebang,
        "without-shebang": withoutShebang,
      },
      {},
      root,
    );

    for (const { name, config } of builds) {
      const output = config.build?.rollupOptions?.output;
      assert.ok(output && !Array.isArray(output));
      assert.equal(typeof output.banner, "function");

      const banner = await output.banner({});
      assert.equal(
        banner,
        name === "with-shebang" ? "" : "#!/usr/bin/env node",
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
