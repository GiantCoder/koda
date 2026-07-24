import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Crop the top band of a portrait behind-bowler frame where the distant batter stands. */
export async function cropJpegBase64TopBand(
  base64: string,
  heightFraction = 0.55
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "koda-crop-"));
  const inPath = join(dir, "in.jpg");
  const outPath = join(dir, "out.jpg");
  try {
    await writeFile(inPath, Buffer.from(base64, "base64"));
    const vf = `crop=iw:floor(ih*${heightFraction}):0:0`;
    await execFileAsync(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-y", "-i", inPath, "-vf", vf, "-q:v", "4", outPath],
      { maxBuffer: 10 * 1024 * 1024 }
    );
    const out = await readFile(outPath);
    return out.toString("base64");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Crop each frame to the far-end band (parallel, capped concurrency). */
export async function cropFramesToFarEndBand(
  framesBase64: string[],
  heightFraction = 0.55
): Promise<string[]> {
  const batchSize = 6;
  const out: string[] = [];
  for (let i = 0; i < framesBase64.length; i += batchSize) {
    const chunk = framesBase64.slice(i, i + batchSize);
    const cropped = await Promise.all(
      chunk.map((frame) => cropJpegBase64TopBand(frame, heightFraction))
    );
    out.push(...cropped);
  }
  return out;
}
