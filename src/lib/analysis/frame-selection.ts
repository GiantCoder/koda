/** Evenly sample up to `count` frames (first and last included). */
export function sampleFramesEvenly(frames: string[], count: number): string[] {
  if (frames.length <= count) return frames;
  const indices = new Set<number>();
  indices.add(0);
  indices.add(frames.length - 1);
  for (let i = 0; i < count; i++) {
    indices.add(Math.round((i * (frames.length - 1)) / (count - 1)));
  }
  return [...indices].sort((a, b) => a - b).map((idx) => frames[idx]);
}

export interface ShotClassificationFrameOptions {
  durationSeconds?: number | null;
  /** Nets clip where pose tracked foreground bowler — use only late frames. */
  netsBehindBowler?: boolean;
}

/** Last ~65% of frames only — after bowler delivery, batter response dominates. */
export function sampleLateFramesOnly(frames: string[], budget: number): string[] {
  if (frames.length <= budget) return frames;
  const startIdx = Math.floor(frames.length * 0.35);
  const pool = frames.slice(startIdx);
  if (pool.length <= budget) return pool;

  const indices = new Set<number>();
  indices.add(pool.length - 1);
  for (let i = 0; i < budget; i++) {
    indices.add(Math.round((i * (pool.length - 1)) / Math.max(1, budget - 1)));
  }
  return [...indices].sort((a, b) => a - b).map((idx) => pool[idx]);
}

/**
 * Frames for shot classification — bias toward the END of short clips where the
 * batter's response (leave, block, or shot) happens after the bowler's delivery.
 */
export function sampleFramesForShotClassification(
  frames: string[],
  durationSecondsOrOptions?: number | null | ShotClassificationFrameOptions
): string[] {
  const options: ShotClassificationFrameOptions =
    typeof durationSecondsOrOptions === "object" && durationSecondsOrOptions !== null
      ? durationSecondsOrOptions
      : { durationSeconds: durationSecondsOrOptions, netsBehindBowler: false };

  const durationSeconds = options.durationSeconds;
  const netsBehindBowler = options.netsBehindBowler ?? false;

  if (netsBehindBowler) {
    return sampleLateFramesOnly(frames, 10);
  }

  if (frames.length <= 12) return frames;

  const shortClip = durationSeconds != null && durationSeconds > 0 && durationSeconds <= 6;
  const budget = shortClip ? 14 : 12;

  if (!shortClip) {
    return sampleFramesEvenly(frames, budget);
  }

  const splitIdx = Math.floor(frames.length * 0.45);
  const earlyPool = frames.slice(0, Math.max(1, splitIdx));
  const latePool = frames.slice(splitIdx);

  const indices = new Set<number>();
  indices.add(frames.length - 1);

  const earlyCount = Math.min(4, Math.max(2, Math.floor(budget * 0.3)));
  for (let i = 0; i < earlyCount; i++) {
    const idx = Math.round((i * (earlyPool.length - 1)) / Math.max(1, earlyCount - 1));
    indices.add(idx);
  }

  const lateCount = budget - indices.size;
  for (let i = 0; i < lateCount; i++) {
    const localIdx = Math.round((i * (latePool.length - 1)) / Math.max(1, lateCount - 1));
    indices.add(splitIdx + localIdx);
  }

  return [...indices].sort((a, b) => a - b).map((idx) => frames[idx]);
}
