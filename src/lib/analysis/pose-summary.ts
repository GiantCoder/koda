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
  /** Pose timeline likely tracks foreground bowler/coach, not the distant batter. */
  likelyForegroundBowlersRunUp: boolean;
  noseXSpan: number;
  /** Mean nose→ankle (or nose→hip) vertical span in normalized frame coords. */
  meanBodyHeightFrac: number;
  /** Mean nose Y in normalized frame coords (0 = top). */
  meanNoseY: number;
  reason: string | null;
}

function frameBodyHeightFrac(frame: FrameLandmarks): number | null {
  const nose = frame.keypoints.nose;
  const top =
    nose && nose.visibility >= 0.3
      ? nose.y
      : [frame.keypoints.leftShoulder, frame.keypoints.rightShoulder]
          .filter((p): p is NonNullable<typeof p> => Boolean(p && p.visibility >= 0.3))
          .reduce<number | null>((min, p) => (min == null ? p.y : Math.min(min, p.y)), null);

  const ankleYs = [frame.keypoints.leftAnkle, frame.keypoints.rightAnkle]
    .filter((p): p is NonNullable<typeof p> => Boolean(p && p.visibility >= 0.3))
    .map((p) => p.y);
  const hipYs = [frame.keypoints.leftHip, frame.keypoints.rightHip]
    .filter((p): p is NonNullable<typeof p> => Boolean(p && p.visibility >= 0.3))
    .map((p) => p.y);

  const bottom =
    ankleYs.length > 0 ? Math.max(...ankleYs) : hipYs.length > 0 ? Math.max(...hipYs) : null;

  if (top == null || bottom == null || bottom <= top) return null;
  return bottom - top;
}

function meanLandmarkY(
  pose: PoseEstimateResponse,
  name: "nose" | "leftHip" | "rightHip"
): number | null {
  const ys = pose.landmarks
    .map((f) => f.keypoints[name])
    .filter((p): p is NonNullable<typeof p> => Boolean(p && p.visibility >= 0.3))
    .map((p) => p.y);
  if (ys.length === 0) return null;
  return ys.reduce((a, b) => a + b, 0) / ys.length;
}

/**
 * Detect when MediaPipe tracked the large foreground bowler/coach instead of the distant batter.
 * Common in nets clips filmed from behind the bowler (or a coach with a ball thrower).
 */
export function assessPoseTrackingSubject(
  pose: PoseEstimateResponse,
  opts?: { frameHeight?: number }
): PoseSubjectAssessment {
  const withNose = pose.landmarks
    .map((f) => f.keypoints.nose)
    .filter((p): p is NonNullable<typeof p> => Boolean(p && p.visibility >= 0.3));

  const extents = pose.landmarks
    .map(frameBodyHeightFrac)
    .filter((v): v is number => v != null);
  const meanBodyHeightFrac =
    extents.length > 0 ? extents.reduce((a, b) => a + b, 0) / extents.length : 0;

  const noseYs = withNose.map((p) => p.y);
  const meanNoseY =
    noseYs.length > 0 ? noseYs.reduce((a, b) => a + b, 0) / noseYs.length : 0;

  if (withNose.length < 4 && extents.length < 4) {
    return {
      likelyForegroundBowlersRunUp: false,
      noseXSpan: 0,
      meanBodyHeightFrac,
      meanNoseY,
      reason: null,
    };
  }

  const xs = withNose.map((p) => p.x);
  const noseXSpan = withNose.length >= 2 ? Math.max(...xs) - Math.min(...xs) : 0;

  // Pixel bbox height vs full frame — strongest signal for a large foreground figure.
  const bboxH = pose.batsman_bbox ? Number(pose.batsman_bbox.h) : NaN;
  const bboxY = pose.batsman_bbox ? Number(pose.batsman_bbox.y) : NaN;
  const frameH = opts?.frameHeight;
  if (
    frameH != null &&
    frameH > 0 &&
    Number.isFinite(bboxH) &&
    bboxH / frameH >= 0.28
  ) {
    return {
      likelyForegroundBowlersRunUp: true,
      noseXSpan,
      meanBodyHeightFrac,
      meanNoseY,
      reason: `bbox_height_frac=${(bboxH / frameH).toFixed(2)} suggests large foreground subject, not distant batter`,
    };
  }

  // Large subject filling much of the frame = foreground coach/bowler (not distant batter).
  // Distant batters in behind-bowler nets typically span ~0.08–0.22 of frame height.
  if (meanBodyHeightFrac >= 0.26) {
    return {
      likelyForegroundBowlersRunUp: true,
      noseXSpan,
      meanBodyHeightFrac,
      meanNoseY,
      reason: `mean_body_height_frac=${meanBodyHeightFrac.toFixed(2)} suggests large foreground subject, not distant batter`,
    };
  }

  // Mid/low nose + still-substantial body = coach standing in front of camera (portrait nets).
  if (meanNoseY >= 0.35 && meanBodyHeightFrac >= 0.22) {
    return {
      likelyForegroundBowlersRunUp: true,
      noseXSpan,
      meanBodyHeightFrac,
      meanNoseY,
      reason: `mean_nose_y=${meanNoseY.toFixed(2)} with body_height_frac=${meanBodyHeightFrac.toFixed(2)} suggests foreground subject`,
    };
  }

  // Bbox centered too low in frame → foreground coach even if truncated.
  if (
    frameH != null &&
    frameH > 0 &&
    Number.isFinite(bboxY) &&
    Number.isFinite(bboxH) &&
    (bboxY + bboxH / 2) / frameH >= 0.45 &&
    bboxH / frameH >= 0.12
  ) {
    return {
      likelyForegroundBowlersRunUp: true,
      noseXSpan,
      meanBodyHeightFrac,
      meanNoseY,
      reason: `bbox_center_y_frac=${((bboxY + bboxH / 2) / frameH).toFixed(2)} suggests foreground subject`,
    };
  }

  // Bowler run-up: figure sweeps horizontally across frame (see logs: 0.15 → 0.87).
  if (noseXSpan >= 0.32) {
    return {
      likelyForegroundBowlersRunUp: true,
      noseXSpan,
      meanBodyHeightFrac,
      meanNoseY,
      reason: `nose_x_span=${noseXSpan.toFixed(2)} suggests foreground run-up, not distant batter`,
    };
  }

  return {
    likelyForegroundBowlersRunUp: false,
    noseXSpan,
    meanBodyHeightFrac,
    meanNoseY,
    reason: null,
  };
}

/**
 * True when remapped pose looks like a small figure in the upper/far band (distant batter),
 * not a truncated foreground coach.
 */
export function looksLikeDistantBatter(
  pose: PoseEstimateResponse,
  opts?: { frameHeight?: number }
): boolean {
  if (pose.landmarks.length < 3) return false;

  const extents = pose.landmarks
    .map(frameBodyHeightFrac)
    .filter((v): v is number => v != null);
  const meanBodyHeightFrac =
    extents.length > 0 ? extents.reduce((a, b) => a + b, 0) / extents.length : 0;
  const meanNoseY = meanLandmarkY(pose, "nose");
  if (meanNoseY == null) return false;

  // Distant batter: head in upper portion of full frame, modest body span.
  if (meanNoseY > 0.36) return false;
  if (meanBodyHeightFrac < 0.04 || meanBodyHeightFrac > 0.26) return false;

  const noseXs = pose.landmarks
    .map((f) => f.keypoints.nose)
    .filter((p): p is NonNullable<typeof p> => Boolean(p && p.visibility >= 0.3))
    .map((p) => p.x);
  if (noseXs.length > 0) {
    const meanNoseX = noseXs.reduce((a, b) => a + b, 0) / noseXs.length;
    // Foreground coach in these clips is usually far left; batter sits near center.
    if (meanNoseX < 0.22) return false;
  }

  const frameH = opts?.frameHeight;
  const bboxY = pose.batsman_bbox ? Number(pose.batsman_bbox.y) : NaN;
  const bboxH = pose.batsman_bbox ? Number(pose.batsman_bbox.h) : NaN;
  if (frameH != null && frameH > 0 && Number.isFinite(bboxY) && Number.isFinite(bboxH)) {
    const centerY = (bboxY + bboxH / 2) / frameH;
    const heightFrac = bboxH / frameH;
    if (centerY > 0.42) return false;
    if (heightFrac > 0.3) return false;
  }

  return true;
}

/** Crop height fractions to try when recovering a far-end batter (tightest last). */
export const FAR_END_POSE_CROP_FRACTIONS = [0.42, 0.36, 0.30] as const;

/**
 * Remap pose landmarks estimated on a top-band crop back into full-frame normalized coords.
 * Pixel batsman_bbox from the crop is already top-left aligned with the full frame when leftTrim=0.
 */
export function remapPoseFromTopBandCrop(
  croppedPose: PoseEstimateResponse,
  heightFraction = 0.55
): PoseEstimateResponse {
  return remapPoseFromFarEndRoi(croppedPose, {
    heightFraction,
    leftTrimFraction: 0,
    rightTrimFraction: 0,
  });
}

/**
 * Remap pose from a far-end ROI crop (top band + left/right trim) into full-frame coords.
 */
export function remapPoseFromFarEndRoi(
  croppedPose: PoseEstimateResponse,
  roi: {
    heightFraction: number;
    leftTrimFraction: number;
    rightTrimFraction: number;
    /** Full-frame pixel size — required to remap pixel bbox accurately. */
    fullFrameWidth?: number;
    fullFrameHeight?: number;
  }
): PoseEstimateResponse {
  const heightFrac = Math.max(0.1, Math.min(1, roi.heightFraction));
  const leftTrim = Math.max(0, Math.min(0.45, roi.leftTrimFraction));
  const rightTrim = Math.max(0, Math.min(0.45, roi.rightTrimFraction));
  const widthFrac = Math.max(0.2, 1 - leftTrim - rightTrim);

  const landmarks = croppedPose.landmarks.map((frame) => {
    const keypoints: FrameLandmarks["keypoints"] = {};
    for (const [name, kp] of Object.entries(frame.keypoints)) {
      keypoints[name] = {
        ...kp,
        x: leftTrim + kp.x * widthFrac,
        y: kp.y * heightFrac,
      };
    }
    return { ...frame, keypoints };
  });

  let batsman_bbox = croppedPose.batsman_bbox;
  const fullW = roi.fullFrameWidth;
  if (
    batsman_bbox &&
    fullW != null &&
    fullW > 0 &&
    typeof batsman_bbox.x === "number" &&
    typeof batsman_bbox.y === "number" &&
    typeof batsman_bbox.w === "number" &&
    typeof batsman_bbox.h === "number"
  ) {
    // Cropped bbox pixels are relative to the ROI; offset X by the left trim in full-frame pixels.
    const originX = fullW * leftTrim;
    batsman_bbox = {
      x: Math.round(originX + batsman_bbox.x),
      y: Math.round(batsman_bbox.y),
      w: Math.round(batsman_bbox.w),
      h: Math.round(batsman_bbox.h),
    };
  }

  return {
    processingMs: croppedPose.processingMs,
    batsman_bbox,
    landmarks,
  };
}

/**
 * When MediaPipe tracked the foreground bowler, the batter's pose appears only
 * in frames where the tracked subject is relatively stationary (low inter-frame
 * nose x-drift). Filter to those frames to recover usable batter pose data.
 * Returns null if fewer than 3 stable frames remain — not enough to be useful.
 */
export function extractBatterFramesFromMixedPose(
  pose: PoseEstimateResponse
): PoseEstimateResponse | null {
  if (pose.landmarks.length < 4) return null;

  const stable: typeof pose.landmarks = [];

  for (let i = 0; i < pose.landmarks.length; i++) {
    const frame = pose.landmarks[i];
    if (i === 0) {
      stable.push(frame);
      continue;
    }
    const prev = pose.landmarks[i - 1];
    const noseA = prev.keypoints.nose;
    const noseB = frame.keypoints.nose;

    // If nose is invisible in either frame, treat frame as potentially batter
    if (!noseA || !noseB || noseA.visibility < 0.3 || noseB.visibility < 0.3) {
      stable.push(frame);
      continue;
    }

    const drift = Math.abs(noseB.x - noseA.x);
    if (drift < 0.06) {
      // Less than 6% horizontal drift — subject is stationary, likely the batter
      stable.push(frame);
    }
  }

  if (stable.length < 3) return null;

  return {
    landmarks: stable,
    batsman_bbox: pose.batsman_bbox,
    processingMs: pose.processingMs,
  };
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

  // Both wrists close together at similar height = hands-together defensive grip
  const wristHeightDiff = Math.abs((lw?.y ?? 0) - (rw?.y ?? 0));
  const wristLateralDiff = Math.abs((lw?.x ?? 0) - (rw?.x ?? 0));
  if (
    lw && rw &&
    wristHeightDiff < 0.08 &&
    wristLateralDiff < 0.14 &&
    dominantWrist.y > shoulderMidY // wrists below shoulder = not a raised leave position
  ) {
    cues.push("hands_together_mid");
  }

  // Both wrists below hip midpoint = bat coming down or held low (defensive or block)
  if (lw && rw && lh && rh && lw.y > hipMidY && rw.y > hipMidY) {
    cues.push("both_wrists_low");
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
