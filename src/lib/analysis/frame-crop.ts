import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface FarEndBatterRoi {
  /** Fraction of frame height kept from the top (distant batter band). */
  heightFraction: number;
  /** Fraction of frame width trimmed from the left (drops foreground coach/bowler). */
  leftTrimFraction: number;
  /** Fraction of frame width trimmed from the right. */
  rightTrimFraction: number;
}

/** Default ROI for behind-bowler / coach-with-thrower nets clips. */
export const DEFAULT_FAR_END_BATTER_ROI: FarEndBatterRoi = {
  heightFraction: 0.42,
  leftTrimFraction: 0.28,
  rightTrimFraction: 0.08,
};

/** Progressive ROIs — stronger left trim; taller band so the distant batter remains detectable. */
export const FAR_END_BATTER_ROI_ATTEMPTS: readonly FarEndBatterRoi[] = [
  { heightFraction: 0.58, leftTrimFraction: 0.45, rightTrimFraction: 0.04 },
  { heightFraction: 0.52, leftTrimFraction: 0.48, rightTrimFraction: 0.04 },
  { heightFraction: 0.48, leftTrimFraction: 0.5, rightTrimFraction: 0.05 },
];

/** Milder ROI for Gemini classification frames (keep batter visible; less aggressive than pose ROIs). */
export const CLASSIFICATION_FAR_END_ROI: FarEndBatterRoi = {
  heightFraction: 0.62,
  leftTrimFraction: 0.22,
  rightTrimFraction: 0.04,
};

export interface PixelBbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Black out a foreground subject region so MediaPipe re-locks onto the distant batter.
 * Masks from the left edge through the right of the detected bbox (with modest padding).
 * Avoid over-masking into the pitch centre where the batter stands.
 */
export async function maskForegroundSubjectInJpegBase64(
  base64: string,
  bbox: PixelBbox,
  frameWidth: number,
  frameHeight: number
): Promise<string> {
  const padX = Math.max(16, Math.round(bbox.w * 0.2));
  // Cap mask so we never cover more than ~40% of frame width (keeps centre batter visible).
  const right = Math.min(
    Math.round(frameWidth * 0.4),
    Math.max(1, bbox.x + bbox.w + padX)
  );
  const x = 0;
  const y = 0;
  const w = Math.max(1, right);
  const h = frameHeight;

  const dir = await mkdtemp(join(tmpdir(), "koda-mask-"));
  const inPath = join(dir, "in.jpg");
  const outPath = join(dir, "out.jpg");
  try {
    await writeFile(inPath, Buffer.from(base64, "base64"));
    const vf = `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=black:t=fill`;
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

export async function maskForegroundSubjectInFrames(
  framesBase64: string[],
  bbox: PixelBbox,
  frameWidth: number,
  frameHeight: number
): Promise<string[]> {
  const batchSize = 6;
  const out: string[] = [];
  for (let i = 0; i < framesBase64.length; i += batchSize) {
    const chunk = framesBase64.slice(i, i + batchSize);
    const masked = await Promise.all(
      chunk.map((frame) =>
        maskForegroundSubjectInJpegBase64(frame, bbox, frameWidth, frameHeight)
      )
    );
    out.push(...masked);
  }
  return out;
}

/** Crop the top band of a portrait behind-bowler frame where the distant batter stands. */
export async function cropJpegBase64TopBand(
  base64: string,
  heightFraction = 0.4
): Promise<string> {
  return cropJpegBase64FarEndBatterRoi(base64, {
    heightFraction,
    leftTrimFraction: 0,
    rightTrimFraction: 0,
  });
}

/**
 * Crop to the far-end batter region: top band + trim left/right foreground.
 * Used when a large coach/bowler dominates the near side of behind-stumps clips.
 */
export async function cropJpegBase64FarEndBatterRoi(
  base64: string,
  roi: FarEndBatterRoi = DEFAULT_FAR_END_BATTER_ROI
): Promise<string> {
  const heightFraction = Math.max(0.15, Math.min(1, roi.heightFraction));
  const leftTrim = Math.max(0, Math.min(0.45, roi.leftTrimFraction));
  const rightTrim = Math.max(0, Math.min(0.45, roi.rightTrimFraction));
  const widthFrac = Math.max(0.2, 1 - leftTrim - rightTrim);

  const dir = await mkdtemp(join(tmpdir(), "koda-crop-"));
  const inPath = join(dir, "in.jpg");
  const outPath = join(dir, "out.jpg");
  try {
    await writeFile(inPath, Buffer.from(base64, "base64"));
    const vf = `crop=floor(iw*${widthFrac}):floor(ih*${heightFraction}):floor(iw*${leftTrim}):0`;
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
  heightFraction = 0.4
): Promise<string[]> {
  return cropFramesToFarEndBatterRoi(framesBase64, {
    heightFraction,
    leftTrimFraction: 0,
    rightTrimFraction: 0,
  });
}

/** Crop each frame to the far-end batter ROI (top band + side trims). */
export async function cropFramesToFarEndBatterRoi(
  framesBase64: string[],
  roi: FarEndBatterRoi = DEFAULT_FAR_END_BATTER_ROI
): Promise<string[]> {
  const batchSize = 6;
  const out: string[] = [];
  for (let i = 0; i < framesBase64.length; i += batchSize) {
    const chunk = framesBase64.slice(i, i + batchSize);
    const cropped = await Promise.all(
      chunk.map((frame) => cropJpegBase64FarEndBatterRoi(frame, roi))
    );
    out.push(...cropped);
  }
  return out;
}
