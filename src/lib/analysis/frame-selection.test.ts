import { describe, expect, it } from "vitest";
import {
  sampleFramesForShotClassification,
  sampleLateFramesOnly,
} from "./frame-selection";

describe("sampleLateFramesOnly", () => {
  it("returns only frames from the latter portion of the clip", () => {
    const frames = Array.from({ length: 27 }, (_, i) => `f${i}`);
    const sampled = sampleLateFramesOnly(frames, 10);
    expect(sampled.length).toBeLessThanOrEqual(10);
    for (const frame of sampled) {
      const idx = Number(frame.slice(1));
      expect(idx).toBeGreaterThanOrEqual(Math.floor(27 * 0.35));
    }
    expect(sampled[sampled.length - 1]).toBe("f26");
  });
});

describe("sampleFramesForShotClassification", () => {
  it("uses late frames only when netsBehindBowler is set", () => {
    const frames = Array.from({ length: 27 }, (_, i) => `f${i}`);
    const sampled = sampleFramesForShotClassification(frames, {
      durationSeconds: 3.3,
      netsBehindBowler: true,
    });
    expect(sampled.length).toBeLessThanOrEqual(10);
    for (const frame of sampled) {
      const idx = Number(frame.slice(1));
      expect(idx).toBeGreaterThanOrEqual(Math.floor(27 * 0.35));
    }
  });
});
