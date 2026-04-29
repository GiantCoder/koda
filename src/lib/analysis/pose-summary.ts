import type { PoseEstimateResponse } from "./mediapipe-types";

const KEY_JOINTS = [
  "leftShoulder",
  "rightShoulder",
  "leftHip",
  "rightHip",
  "leftWrist",
  "rightWrist",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
  "nose",
] as const;

/** Compact text for Gemini: sampled frames + key joint x/y/visibility. */
export function buildPoseSummaryForLlm(pose: PoseEstimateResponse): string {
  const lines: string[] = [];
  lines.push(`frames_with_pose: ${pose.landmarks.length}`);
  lines.push(`mediapipe_processing_ms: ${pose.processingMs}`);
  if (pose.batsman_bbox) {
    lines.push(`crop_bbox: ${JSON.stringify(pose.batsman_bbox)}`);
  }

  const sample = pose.landmarks.length > 24 ? pickEvenly(pose.landmarks, 24) : pose.landmarks;

  for (const frame of sample) {
    const parts: string[] = [];
    for (const name of KEY_JOINTS) {
      const p = frame.keypoints[name];
      if (p) {
        parts.push(
          `${name}:x${p.x.toFixed(3)} y${p.y.toFixed(3)} v${p.visibility.toFixed(2)}`
        );
      }
    }
    lines.push(
      `t=${frame.timestamp}s idx=${frame.frameIndex} conf=${frame.poseConfidence} | ${parts.join("; ")}`
    );
  }

  const text = lines.join("\n");
  const max = 14_000;
  return text.length > max ? `${text.slice(0, max)}\n...[truncated]` : text;
}

function pickEvenly<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * (items.length - 1)) / (count - 1));
    out.push(items[idx]);
  }
  return out;
}
