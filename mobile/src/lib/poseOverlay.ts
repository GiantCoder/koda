/**
 * Pure math/constants ported from web's app/components/video/VideoSkeletonOverlay.tsx
 * so PoseSkeletonOverlay.tsx (react-native-svg) can draw the same skeleton
 * web draws on a <canvas>. Kept framework-agnostic and unit-testable.
 *
 * Phase 8: previously this assumed the video fills its container exactly
 * (VideoView used contentFit="cover"), mapping normalized pose coordinates
 * straight onto the container's full width/height. That's only correct
 * when the clip's aspect ratio happens to match the container's -- for
 * anything else, "cover" crops the video to fill the box, so the visible
 * frame is no longer what the 0-1 pose coordinates were computed against,
 * and the skeleton drifts off the subject. A batting clip (subject roughly
 * centered, fixed camera) mostly got away with it; a bowling run-up moves
 * the subject much further across frame, so the same drift became obvious
 * there. Fixed by switching to contentFit="contain" and porting web's
 * exact getContainedVideoContentBox letterbox math below, so every
 * mapPoint() call goes through the actual visible video content box
 * rather than the raw container box. Bbox support (tracked-subject box,
 * both the real per-frame version and the legacy static fallback) is also
 * ported in this pass -- it was deliberately trimmed in Phase 4, now
 * needed for the Video/Skeleton/Bbox layer toggle.
 */
import type { FrameLandmarks, PoseKeypoint, PoseEstimateResponse } from "@/api/analysis";

export const POSE_CONNECTIONS: Array<[string, string]> = [
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];

export const JOINT_STYLE = {
  head: { color: "#FFFFFF", label: "head" },
  shoulders: { color: "#FACC15", label: "shoulders" },
  elbows: { color: "#FB923C", label: "elbows" },
  wrists: { color: "#F43F5E", label: "wrists" },
  hips: { color: "#A855F7", label: "hips" },
  knees: { color: "#22D3EE", label: "knees" },
  ankles: { color: "#34D399", label: "ankles" },
} as const;

export const JOINT_LEGEND = [
  JOINT_STYLE.head,
  JOINT_STYLE.shoulders,
  JOINT_STYLE.elbows,
  JOINT_STYLE.wrists,
  JOINT_STYLE.hips,
  JOINT_STYLE.knees,
  JOINT_STYLE.ankles,
] as const;

export const JOINT_COLOUR_BY_NAME: Record<string, string> = {
  nose: JOINT_STYLE.head.color,
  leftEye: JOINT_STYLE.head.color,
  rightEye: JOINT_STYLE.head.color,
  leftEar: JOINT_STYLE.head.color,
  rightEar: JOINT_STYLE.head.color,
  leftShoulder: JOINT_STYLE.shoulders.color,
  rightShoulder: JOINT_STYLE.shoulders.color,
  leftElbow: JOINT_STYLE.elbows.color,
  rightElbow: JOINT_STYLE.elbows.color,
  leftWrist: JOINT_STYLE.wrists.color,
  rightWrist: JOINT_STYLE.wrists.color,
  leftHip: JOINT_STYLE.hips.color,
  rightHip: JOINT_STYLE.hips.color,
  leftKnee: JOINT_STYLE.knees.color,
  rightKnee: JOINT_STYLE.knees.color,
  leftAnkle: JOINT_STYLE.ankles.color,
  rightAnkle: JOINT_STYLE.ankles.color,
};

export const JOINT_RADIUS = 3;
export const WRIST_RADIUS = 3.75;

export function findNearestPoseFrame(
  frames: FrameLandmarks[],
  currentTimeSeconds: number
): FrameLandmarks | null {
  if (frames.length === 0) return null;
  let nearest = frames[0];
  let nearestDistance = Math.abs(nearest.timestamp - currentTimeSeconds);
  for (let i = 1; i < frames.length; i++) {
    const distance = Math.abs(frames[i].timestamp - currentTimeSeconds);
    if (distance < nearestDistance) {
      nearest = frames[i];
      nearestDistance = distance;
    }
  }
  return nearest;
}

export interface Point {
  x: number;
  y: number;
}

export interface ContentBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Ported from web's getContainedVideoContentBox: the visible video content
 * rectangle within a `contentFit="contain"` player, given the container's
 * layout size and the source video's native pixel size. Letterboxes on
 * whichever axis doesn't match the clip's aspect ratio, exactly like
 * object-fit:contain -- this is what makes pose points land on the subject
 * regardless of the clip's orientation/aspect ratio. */
export function getContainedVideoContentBox(
  containerWidth: number,
  containerHeight: number,
  sourceWidth: number,
  sourceHeight: number
): ContentBox | null {
  if (!sourceWidth || !sourceHeight || containerWidth <= 0 || containerHeight <= 0) return null;
  const scale = Math.min(containerWidth / sourceWidth, containerHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const left = (containerWidth - width) / 2;
  const top = (containerHeight - height) / 2;
  return { left, top, width, height };
}

/** Maps a normalized (0-1) keypoint into pixel coordinates within the
 * video's actual visible content box (see getContainedVideoContentBox),
 * not the raw container. */
export function mapPoint(kp: PoseKeypoint, box: ContentBox): Point {
  return { x: box.left + kp.x * box.width, y: box.top + kp.y * box.height };
}

export interface NormalizedBbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Per-frame tracked-subject box computed from that frame's own visible
 * keypoints -- ported from web verbatim. Preferred over the clip-level
 * legacy `batsman_bbox`, which is a single static box that can drift away
 * from early/late frames. */
export function bboxFromFrameLandmarks(
  frame: FrameLandmarks,
  paddingRatio = 0.12
): NormalizedBbox | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const kp of Object.values(frame.keypoints)) {
    if (kp.visibility < 0.2) continue;
    if (!Number.isFinite(kp.x) || !Number.isFinite(kp.y)) continue;
    xs.push(kp.x);
    ys.push(kp.y);
  }
  if (xs.length === 0) return null;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padX = Math.max(0.01, (maxX - minX) * paddingRatio);
  const padY = Math.max(0.01, (maxY - minY) * paddingRatio);
  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  const w = Math.min(1 - x, maxX - minX + 2 * padX);
  const h = Math.min(1 - y, maxY - minY + 2 * padY);
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

function isValidLegacyBbox(
  value: Record<string, unknown> | null | undefined
): value is { x: number; y: number; w: number; h: number } {
  return Boolean(
    value &&
      typeof value.x === "number" &&
      typeof value.y === "number" &&
      typeof value.w === "number" &&
      typeof value.h === "number" &&
      value.w > 0 &&
      value.h > 0
  );
}

/** Resolves the tracked-subject box to draw for a frame: the per-frame
 * normalized box when available, else the clip-level legacy pixel bbox
 * (converted into the video's content box), else null. */
export function resolveBboxRect(
  frame: FrameLandmarks,
  poseData: PoseEstimateResponse,
  box: ContentBox,
  sourceWidth: number,
  sourceHeight: number
): { x: number; y: number; w: number; h: number } | null {
  const normalized = bboxFromFrameLandmarks(frame);
  if (normalized) {
    return {
      x: box.left + normalized.x * box.width,
      y: box.top + normalized.y * box.height,
      w: normalized.w * box.width,
      h: normalized.h * box.height,
    };
  }
  if (isValidLegacyBbox(poseData.batsman_bbox) && sourceWidth > 0 && sourceHeight > 0) {
    const legacy = poseData.batsman_bbox;
    return {
      x: box.left + (legacy.x / sourceWidth) * box.width,
      y: box.top + (legacy.y / sourceHeight) * box.height,
      w: (legacy.w / sourceWidth) * box.width,
      h: (legacy.h / sourceHeight) * box.height,
    };
  }
  return null;
}

export interface WristArrow {
  joint: "leftWrist" | "rightWrist";
  from: Point;
  to: Point;
}

/** Wrist velocity vectors: direction from the current frame's wrist to a
 * frame ~0.15s ahead, scaled for visibility. Same approach as web. */
export function computeWristArrows(
  currentFrame: FrameLandmarks,
  allFrames: FrameLandmarks[],
  box: ContentBox
): WristArrow[] {
  const nextFrame = findNearestPoseFrame(allFrames, currentFrame.timestamp + 0.15);
  if (!nextFrame) return [];
  const arrows: WristArrow[] = [];
  (["leftWrist", "rightWrist"] as const).forEach((joint) => {
    const currKp = currentFrame.keypoints[joint];
    const nextKp = nextFrame.keypoints[joint];
    if (!currKp || !nextKp) return;
    if (currKp.visibility < 0.25 || nextKp.visibility < 0.25) return;
    const p1 = mapPoint(currKp, box);
    const p2 = mapPoint(nextKp, box);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude < 3) return;
    const angle = Math.atan2(dy, dx);
    const displayLen = Math.min(36, Math.max(10, magnitude * 2.5));
    arrows.push({
      joint,
      from: p1,
      to: { x: p1.x + Math.cos(angle) * displayLen, y: p1.y + Math.sin(angle) * displayLen },
    });
  });
  return arrows;
}
