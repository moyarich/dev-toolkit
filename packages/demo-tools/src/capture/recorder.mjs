import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export function createFrameRecorder({ page, framesDirectory, frameRate = 10 }) {
  if (!page) throw new TypeError("createFrameRecorder requires a Playwright page.");
  let running = false;
  let frameNumber = 0;
  let session;
  let startedAt = 0;
  let lastFrameData;
  let writeQueue = Promise.resolve();
  let resolveFirstFrame;
  const firstFrame = new Promise((resolve) => { resolveFirstFrame = resolve; });

  function enqueueFrames(data, targetFrameCount) {
    while (frameNumber < targetFrameCount) {
      const fileName = `${String(frameNumber).padStart(6, "0")}.png`;
      writeQueue = writeQueue.then(() => writeFile(path.join(framesDirectory, fileName), data, "base64"));
      frameNumber += 1;
    }
  }

  return {
    async start() {
      if (running) throw new Error("Frame recorder is already running.");
      await mkdir(framesDirectory, { recursive: true });
      running = true;
      session = await page.context().newCDPSession(page);
      session.on("Page.screencastFrame", ({ data, sessionId }) => {
        void session?.send("Page.screencastFrameAck", { sessionId });
        if (!running) return;
        if (startedAt === 0) startedAt = Date.now();
        lastFrameData = data;
        const target = Math.max(1, Math.floor(((Date.now() - startedAt) * frameRate) / 1000) + 1);
        enqueueFrames(data, target);
        resolveFirstFrame?.();
        resolveFirstFrame = undefined;
      });
      await session.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
      await Promise.race([
        firstFrame,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for the first screencast frame.")), 5000)),
      ]);
    },
    async stop() {
      if (!session) return;
      running = false;
      const elapsed = startedAt ? Date.now() - startedAt : 0;
      if (lastFrameData) enqueueFrames(lastFrameData, Math.max(1, Math.ceil((elapsed * frameRate) / 1000)));
      await session.send("Page.stopScreencast").catch(() => undefined);
      await writeQueue;
      await session.detach().catch(() => undefined);
      session = undefined;
    },
    get frameCount() { return frameNumber; },
  };
}
