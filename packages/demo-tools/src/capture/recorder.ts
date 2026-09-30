import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { BrowserPage, CDPSession } from "../types.ts";

export interface FrameRecorderOptions {
  page: BrowserPage;
  framesDirectory: string;
  frameRate?: number;
}
export interface FrameRecorder {
  start(): Promise<void>;
  stop(): Promise<void>;
  readonly frameCount: number;
}
interface ScreencastFrame {
  data: string;
  sessionId: number;
}

export function createFrameRecorder({
  page,
  framesDirectory,
  frameRate = 10,
}: FrameRecorderOptions): FrameRecorder {
  if (!page) throw new TypeError("createFrameRecorder requires a Playwright page.");
  let running = false;
  let frameNumber = 0;
  let session: CDPSession | undefined;
  let startedAt = 0;
  let lastFrameData: string | undefined;
  let writeQueue: Promise<unknown> = Promise.resolve();
  let resolveFirstFrame: (() => void) | undefined;
  const firstFrame = new Promise<void>((resolve) => {
    resolveFirstFrame = resolve;
  });

  function enqueueFrames(data: string, target: number): void {
    while (frameNumber < target) {
      const file = `${String(frameNumber).padStart(6, "0")}.png`;
      writeQueue = writeQueue.then(() =>
        writeFile(path.join(framesDirectory, file), data, "base64"),
      );
      frameNumber++;
    }
  }

  return {
    async start(): Promise<void> {
      if (running) throw new Error("Frame recorder is already running.");
      await mkdir(framesDirectory, { recursive: true });
      running = true;
      session = await page.context().newCDPSession(page);
      session.on("Page.screencastFrame", ({ data, sessionId }: ScreencastFrame) => {
        void session?.send("Page.screencastFrameAck", { sessionId });
        if (!running) return;
        if (!startedAt) startedAt = Date.now();
        lastFrameData = data;
        enqueueFrames(
          data,
          Math.max(1, Math.floor(((Date.now() - startedAt) * frameRate) / 1000) + 1),
        );
        resolveFirstFrame?.();
        resolveFirstFrame = undefined;
      });
      await session.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
      await Promise.race([
        firstFrame,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Timed out waiting for first screencast frame.")),
            5000,
          ),
        ),
      ]);
    },
    async stop(): Promise<void> {
      if (!session) return;
      running = false;
      const elapsed = startedAt ? Date.now() - startedAt : 0;
      if (lastFrameData)
        enqueueFrames(lastFrameData, Math.max(1, Math.ceil((elapsed * frameRate) / 1000)));
      await session.send("Page.stopScreencast").catch(() => undefined);
      await writeQueue;
      await session.detach().catch(() => undefined);
      session = undefined;
    },
    get frameCount(): number {
      return frameNumber;
    },
  };
}
