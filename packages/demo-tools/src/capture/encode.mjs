import path from "node:path";
import { runProcess } from "../utils/process.mjs";

export async function encodeWebm({ framesDirectory, output, frameRate = 10 }) {
  await runProcess("ffmpeg", [
    "-y", "-framerate", String(frameRate),
    "-i", path.join(framesDirectory, "%06d.png"),
    "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p",
    "-crf", "30", "-b:v", "0", output,
  ]);
  return output;
}

export async function encodeGif({
  input,
  output,
  fps = 12,
  width = 960,
  trimStart = 0,
}) {
  const filter = [
    `trim=start=${trimStart}`,
    "setpts=PTS-STARTPTS",
    `fps=${fps}`,
    `scale='min(${width},iw)':-2:flags=lanczos`,
    "split[a][b]",
    "[a]palettegen=max_colors=256:reserve_transparent=0:stats_mode=full[p]",
    "[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle",
  ].join(",");
  await runProcess("ffmpeg", ["-y", "-i", input, "-filter_complex", filter, "-gifflags", "+transdiff", "-loop", "0", output]);
  return output;
}
