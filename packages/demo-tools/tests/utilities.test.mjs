import assert from "node:assert/strict";
import { access, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { prepareRecordingArtifacts } from "../src/capture/artifacts.mjs";
import { freePort } from "../src/utils/port.mjs";

test("prepareRecordingArtifacts creates paths and cleans stale frames", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "demo-artifacts-"));
  const frames = path.join(root, "frames");
  await prepareRecordingArtifacts({ artifactsDirectory: root, name: "sample" });
  await writeFile(path.join(frames, "stale.png"), "stale");
  const result = await prepareRecordingArtifacts({ artifactsDirectory: root, name: "sample" });
  assert.equal(result.webmPath, path.join(root, "sample.webm"));
  assert.equal(result.gifPath, path.join(root, "sample.gif"));
  await assert.rejects(() => access(path.join(frames, "stale.png")));
});

test("freePort returns a usable TCP port number", async () => {
  const port = await freePort();
  assert.equal(Number.isInteger(port), true);
  assert.equal(port > 0 && port <= 65535, true);
});
