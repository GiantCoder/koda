import { describe, expect, it } from "vitest";
import {
  bboxFromFrameLandmarks,
  findNearestPoseFrame,
} from "@/app/components/video/VideoSkeletonOverlay";
import type { FrameLandmarks } from "@/src/lib/analysis/mediapipe-types";

function frame(
  index: number,
  timestamp: number,
  keypoints: FrameLandmarks["keypoints"]
): FrameLandmarks {
  return { frameIndex: index, timestamp, keypoints, poseConfidence: 0.9 };
}

const kp = (x: number, y: number, visibility = 0.9) => ({
  x,
  y,
  z: 0,
  visibility,
});

describe("bboxFromFrameLandmarks", () => {
  it("returns a padded normalized bbox around visible landmarks", () => {
    const f = frame(2, 0.25, {
      leftShoulder: kp(0.05, 0.55),
      rightShoulder: kp(0.18, 0.55),
      leftHip: kp(0.06, 0.7),
      rightHip: kp(0.17, 0.7),
      leftAnkle: kp(0.04, 0.8),
      rightAnkle: kp(0.19, 0.8),
    });

    const box = bboxFromFrameLandmarks(f);
    expect(box).not.toBeNull();
    expect(box!.x).toBeLessThan(0.05);
    expect(box!.x + box!.w).toBeGreaterThan(0.19);
    expect(box!.y).toBeLessThan(0.55);
    expect(box!.y + box!.h).toBeGreaterThan(0.8);
    // Must stay in normalized space
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.w).toBeLessThanOrEqual(1);
    expect(box!.y + box!.h).toBeLessThanOrEqual(1);
  });

  it("ignores low-visibility points and returns null when none remain", () => {
    const f = frame(0, 0, {
      nose: kp(0.5, 0.5, 0.05),
    });
    expect(bboxFromFrameLandmarks(f)).toBeNull();
  });
});

describe("findNearestPoseFrame", () => {
  it("picks the closest timestamp", () => {
    const frames = [
      frame(0, 0, { nose: kp(0.1, 0.1) }),
      frame(1, 0.25, { nose: kp(0.2, 0.2) }),
      frame(2, 0.5, { nose: kp(0.3, 0.3) }),
    ];
    expect(findNearestPoseFrame(frames, 0.2)?.frameIndex).toBe(1);
  });
});
