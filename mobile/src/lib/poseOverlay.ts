/**
 * Pure math/constants ported from web's app/components/video/VideoSkeletonOverlay.tsx
 * so PoseSkeletonOverlay.tsx (react-native-svg) can draw the same skeleton
 * web draws on a <canvas>. Kept framework-agnostic and unit-testable.
 *
 * Deliberately trimmed from web's version for v1: no tracked-subject bbox
 * box (a secondary drift-tracking rectangle, not the skeleton itself) and
 * no on/off layer toggle UI -- the overlay just draws whenever pose data is
 * available. Both are easy to add back later if wanted.
 */
import type { FrameLandmarks, PoseKeypoint } from "@/api/analysis";

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

/** Maps a normalized (0-1) keypoint to pixel coordinates within a box of
 * the given width/height. Mobile assumes the video fills its container
 * exactly (VideoView uses contentFit="cover") rather than reproducing
 * web's object-fit:contain letterbox math -- a deliberate v1 simplification
 * documented in the roadmap doc; revisit if non-16:9 clips look off. */
export function mapPoint(kp: PoseKeypoint, width: number, height: number): Point {
  return { x: kp.x * width, y: kp.y * height };
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
  width: number,
  height: number
): WristArrow[] {
  const nextFrame = findNearestPoseFrame(allFrames, currentFrame.timestamp + 0.15);
  if (!nextFrame) return [];
  const arrows: WristArrow[] = [];
  (["leftWrist", "rightWrist"] as const).forEach((joint) => {
    const currKp = currentFrame.keypoints[joint];
    const nextKp = nextFrame.keypoints[joint];
    if (!currKp || !nextKp) return;
    if (currKp.visibility < 0.25 || nextKp.visibility < 0.25) return;
    const p1 = mapPoint(currKp, width, height);
    const p2 = mapPoint(nextKp, width, height);
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
