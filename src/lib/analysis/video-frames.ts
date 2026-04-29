import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface VideoProbeResult {
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
}

/** Run ffprobe and return duration and video stream dimensions. */
export async function probeVideoFile(videoPath: string): Promise<VideoProbeResult> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    videoPath,
  ]);
  const parsed = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: Array<{ codec_type?: string; width?: number; height?: number; r_frame_rate?: string }>;
  };
  const durationSeconds = Number(parsed.format?.duration ?? 0);
  const vStream = parsed.streams?.find((s) => s.codec_type === "video");
  const width = vStream?.width ?? 0;
  const height = vStream?.height ?? 0;
  let fps = 30;
  if (vStream?.r_frame_rate) {
    const parts = vStream.r_frame_rate.split("/");
    if (parts.length === 2) {
      const num = Number(parts[0]);
      const den = Number(parts[1]);
      if (den > 0 && Number.isFinite(num)) {
        fps = num / den;
      }
    }
  }
  return {
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
    width,
    height,
    fps: Number.isFinite(fps) && fps > 0 ? fps : 30,
  };
}

export interface ExtractFramesResult {
  /** Base64-encoded JPEG payloads for MediaPipe. */
  framesBase64: string[];
  sampleFps: number;
  width: number;
  height: number;
}

/**
 * Extract up to `maxFrames` JPEG frames at `targetFps` (capped by video length).
 * Scales to max width `scaleWidth` for smaller payloads to MediaPipe.
 */
export async function extractFramesAsJpegBase64(
  videoPath: string,
  options: {
    targetFps: number;
    maxFrames: number;
    scaleWidth: number;
  }
): Promise<ExtractFramesResult> {
  const probe = await probeVideoFile(videoPath);
  const duration = Math.max(0.1, probe.durationSeconds || 0.1);
  const frameCap = Math.min(
    options.maxFrames,
    Math.ceil(duration * options.targetFps) + 2
  );
  const dir = await mkdtemp(join(tmpdir(), "koda-frames-"));
  const pattern = join(dir, "f-%04d.jpg");
  const vf = `fps=${options.targetFps},scale=${options.scaleWidth}:-2:flags=lanczos`;

  await execFileAsync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      videoPath,
      "-an",
      "-vf",
      vf,
      "-frames:v",
      String(frameCap),
      "-q:v",
      "4",
      pattern,
    ],
    { maxBuffer: 50 * 1024 * 1024 }
  );

  const files = (await readdir(dir))
    .filter((f) => f.endsWith(".jpg"))
    .sort();
  const framesBase64: string[] = [];
  for (const name of files) {
    const buf = await readFile(join(dir, name));
    framesBase64.push(buf.toString("base64"));
  }

  await rm(dir, { recursive: true, force: true });

  let width = probe.width;
  let height = probe.height;
  if (width > 0 && options.scaleWidth < width) {
    height = Math.round((height * options.scaleWidth) / width);
    width = options.scaleWidth;
  }

  return {
    framesBase64,
    sampleFps: options.targetFps,
    width,
    height,
  };
}

/** Write buffer to a temp file (e.g. downloaded video) and return path. Caller should unlink. */
export async function writeTempVideoFile(buffer: Buffer, extension: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "koda-video-"));
  const safeExt = extension.replace(/[^a-z0-9.]/gi, "") || "mp4";
  const path = join(dir, `input.${safeExt}`);
  await writeFile(path, buffer);
  return path;
}

export async function removeTempPath(filePath: string): Promise<void> {
  const dir = join(filePath, "..");
  await rm(dir, { recursive: true, force: true }).catch(() => undefined);
}
