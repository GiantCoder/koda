import type { FrameLandmarks, PoseEstimateResponse } from "./mediapipe-types";

const KEY_JOINTS = [
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
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

export interface PoseSubjectAssessment {
  /** Pose timeline likely tracks foreground bowler run-up, not the distant batter. */
  likelyForegroundBowlersRunUp: boolean;
  noseXSpan: number;
  reason: string | null;
}

/**
 * Detect when MediaPipe tracked the large foreground bowler instead of the distant batter.
 * Common in nets clips filmed from behind the bowler.
 */
export function assessPoseTrackingSubject(pose: PoseEstimateResponse): PoseSubjectAssessment {
  const withNose = pose.landmarks
    .map((f) => f.keypoints.nose)
    .filter((p): p is NonNullable<typeof p> => Boolean(p && p.visibility >= 0.3));

  if (withNose.length < 4) {
    return { likelyForegroundBowlersRunUp: false, noseXSpan: 0, reason: null };
  }

  const xs = withNose.map((p) => p.x);
  const noseXSpan = Math.max(...xs) - Math.min(...xs);

  // Bowler run-up: figure sweeps horizontally across frame (see logs: 0.15 → 0.87).
  if (noseXSpan >= 0.32) {
    return {
      likelyForegroundBowlersRunUp: true,
      noseXSpan,
      reason: `nose_x_span=${noseXSpan.toFixed(2)} suggests foreground run-up, not distant batter`,
    };
  }

  return { likelyForegroundBowlersRunUp: false, noseXSpan, reason: null };
}

/** Compact text for Gemini: sampled frames + key joint x/y/visibility + motion cues. */
export function buildPoseSummaryForLlm(pose: PoseEstimateResponse): string {
  const lines: string[] = [];
  lines.push(`frames_with_pose: ${pose.landmarks.length}`);
  lines.push(`mediapipe_processing_ms: ${pose.processingMs}`);
  if (pose.batsman_bbox) {
    lines.push(`batsman_bbox_px: ${JSON.stringify(pose.batsman_bbox)}`);
  }

  const sample = pose.landmarks.length > 36 ? pickEvenly(pose.landmarks, 36) : pose.landmarks;

  for (let i = 0; i < sample.length; i++) {
    const frame = sample[i];
    const parts: string[] = [];
    for (const name of KEY_JOINTS) {
      const p = frame.keypoints[name];
      if (p) {
        parts.push(
          `${name}:x${p.x.toFixed(3)} y${p.y.toFixed(3)} v${p.visibility.toFixed(2)}`
        );
      }
    }
    const cues = deriveStrokeCues(frame);
    const cueText = cues.length > 0 ? ` | cues:${cues.join(",")}` : "";
    lines.push(
      `t=${frame.timestamp}s idx=${frame.frameIndex} conf=${frame.poseConfidence} | ${parts.join("; ")}${cueText}`
    );

    if (i > 0) {
      const prev = sample[i - 1];
      const motion = deriveMotionCues(prev, frame);
      if (motion) {
        lines.push(`  motion_from_prev: ${motion}`);
      }
    }
  }

  const text = lines.join("\n");
  const max = 18_000;
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

function kp(frame: FrameLandmarks, name: (typeof KEY_JOINTS)[number]) {
  return frame.keypoints[name];
}

/** Heuristic cues that help distinguish drives, pulls, cuts, etc. */
function deriveStrokeCues(frame: FrameLandmarks): string[] {
  const cues: string[] = [];
  const lw = kp(frame, "leftWrist");
  const rw = kp(frame, "rightWrist");
  const ls = kp(frame, "leftShoulder");
  const rs = kp(frame, "rightShoulder");
  const lh = kp(frame, "leftHip");
  const rh = kp(frame, "rightHip");
  const la = kp(frame, "leftAnkle");
  const ra = kp(frame, "rightAnkle");

  if (!lw || !rw || !ls || !rs) return cues;

  const shoulderMidY = (ls.y + rs.y) / 2;
  const hipMidY = lh && rh ? (lh.y + rh.y) / 2 : shoulderMidY + 0.15;
  const dominantWrist = lw.y < rw.y ? lw : rw;
  const dominantLabel = lw.y < rw.y ? "L" : "R";

  if (dominantWrist.y < shoulderMidY - 0.05) {
    cues.push(`${dominantLabel}Wrist_high`);
  } else if (dominantWrist.y > hipMidY) {
    cues.push(`${dominantLabel}Wrist_low`);
  }

  if (dominantWrist.x > 0.55) {
    cues.push("bat_side_off");
  } else if (dominantWrist.x < 0.45) {
    cues.push("bat_side_leg");
  }

  if (la && ra) {
    const stance = Math.abs(la.x - ra.x);
    if (stance > 0.12) cues.push("wide_stance");
    if (la.y > ra.y + 0.03) cues.push("front_foot_fwd");
    if (ra.y > la.y + 0.03) cues.push("back_foot_deep");
  }

  const le = kp(frame, "leftElbow");
  const re = kp(frame, "rightElbow");
  const elbow = le && re ? (le.y < re.y ? le : re) : le ?? re;
  if (elbow && dominantWrist.y < elbow.y - 0.02) {
    cues.push("high_elbow");
  }

  return cues;
}

function deriveMotionCues(prev: FrameLandmarks, curr: FrameLandmarks): string | null {
  const parts: string[] = [];
  for (const side of ["leftWrist", "rightWrist"] as const) {
    const a = prev.keypoints[side];
    const b = curr.keypoints[side];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02) {
      const horiz = dx > 0.03 ? "right" : dx < -0.03 ? "left" : "center";
      const vert = dy > 0.03 ? "down" : dy < -0.03 ? "up" : "level";
      parts.push(`${side}:${horiz}_${vert}`);
    }
  }
  return parts.length > 0 ? parts.join("; ") : null;
}
