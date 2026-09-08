import { describe, expect, it } from "vitest";
import {
  normalizeFeedbackArray,
  sampleFramesForScoring,
  SCORING_FRAME_BUDGET,
} from "./scoring-feedback";
import { BOWLING_SCORE_DIMENSIONS } from "@/src/types/technical-feedback";

describe("sampleFramesForScoring", () => {
  it("returns empty for missing frames", () => {
    expect(sampleFramesForScoring(null)).toEqual([]);
    expect(sampleFramesForScoring([])).toEqual([]);
  });

  it("caps at the scoring budget", () => {
    const frames = Array.from({ length: 40 }, (_, i) => `f${i}`);
    const sampled = sampleFramesForScoring(frames);
    expect(sampled.length).toBeLessThanOrEqual(SCORING_FRAME_BUDGET);
    expect(sampled[0]).toBe("f0");
    expect(sampled[sampled.length - 1]).toBe("f39");
  });
});

describe("normalizeFeedbackArray", () => {
  it("pads to dimension length and nulls timestamps without pose", () => {
    const scores = [70, 71, 72, 73, 74, 75, 76, 77];
    const feedback = normalizeFeedbackArray({
      rawFeedback: [
        {
          dimension: "runUpRhythm",
          score: 70,
          diagnosis: "ok",
          timestampSeconds: 1.2,
          evidence: "hips",
          drill: "drill",
          confidence: "high",
        },
      ],
      scores,
      dimensions: BOWLING_SCORE_DIMENSIONS,
      poseAvailable: false,
    });

    expect(feedback).toHaveLength(8);
    expect(feedback.every((f) => f.timestampSeconds === null)).toBe(true);
    expect(feedback.every((f) => f.confidence === "low")).toBe(true);
    expect(feedback[0].dimension).toBe("runUpRhythm");
    expect(feedback[7].score).toBe(77);
  });
});
