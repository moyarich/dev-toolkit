import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

export interface RecordingArtifactsOptions {
  artifactsDirectory: string;
  name?: string;
  cleanFrames?: boolean;
}
export interface RecordingArtifacts {
  framesDirectory: string;
  webmPath: string;
  gifPath: string;
}

export async function prepareRecordingArtifacts({
  artifactsDirectory,
  name = "demo",
  cleanFrames = true,
}: RecordingArtifactsOptions): Promise<RecordingArtifacts> {
  const framesDirectory = path.join(artifactsDirectory, "frames");
  if (cleanFrames) await rm(framesDirectory, { recursive: true, force: true });
  await mkdir(framesDirectory, { recursive: true });
  return {
    framesDirectory,
    webmPath: path.join(artifactsDirectory, `${name}.webm`),
    gifPath: path.join(artifactsDirectory, `${name}.gif`),
  };
}
