import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./gemini-retry", () => ({
  generateContentTextWithRetryAndFallback: vi.fn(),
}));

vi.mock("@/src/lib/analysis/pipeline-log", () => ({
  logGeminiRequest: vi.fn(),
}));

vi.mock("./leaveDetection", () => ({
  detectLeaveWithGemini: vi.fn(),
}));

import { generateContentTextWithRetryAndFallback } from "./gemini-retry";
import { scoreBiomechanicsWithGemini } from "./gemini";
import { BATTING_SCORE_DIMENSIONS } from "@/src/types/technical-feedback";

const mockedGenerate = vi.mocked(generateContentTextWithRetryAndFallback);

function fullFeedback() {
  return BATTING_SCORE_DIMENSIONS.map((dimension, i) => ({
    dimension,
    score: 70 + i,
    diagnosis: `At t=0.80s, ${dimension} cue observed.`,
    timestampSeconds: 0.8,
    evidence: "rightWrist path",
    drill: "Shadow the stroke slowly focusing on this phase.",
    confidence: "high" as const,
  }));
}

describe("scoreBiomechanicsWithGemini", () => {
  beforeEach(() => {
    mockedGenerate.mockReset();
  });

  it("returns 8 feedback items matching batting dimensions", async () => {
    mockedGenerate.mockResolvedValueOnce(
      JSON.stringify({
        scores: [80, 82, 78, 85, 70, 88, 75, 90],
        feedback: fullFeedback(),
        summary: "Strong drive with late head stillness.",
      })
    );

    const result = await scoreBiomechanicsWithGemini({
      shotType: "COVER_DRIVE",
      poseSummary: "t=0.80s idx=3 conf=0.9 | rightWrist:x0.5 y0.4 v0.9",
      analysisId: "bat-1",
    });

    expect(result.scores).toHaveLength(8);
    expect(result.feedback).toHaveLength(8);
    expect(result.feedback.map((f) => f.dimension)).toEqual([...BATTING_SCORE_DIMENSIONS]);
    expect(result.summary).toContain("drive");
  });

  it("repairs missing feedback and forces low confidence without pose", async () => {
    mockedGenerate.mockResolvedValueOnce(
      JSON.stringify({
        scores: [50, 51, 52, 53, 54, 55, 56, 57],
      })
    );

    const result = await scoreBiomechanicsWithGemini({
      shotType: "FORWARD_DEFENCE",
    });

    expect(result.feedback).toHaveLength(8);
    expect(result.feedback.every((f) => f.confidence === "low")).toBe(true);
    expect(result.feedback.every((f) => f.timestampSeconds === null)).toBe(true);
  });

  it("treats unreliable pose as no-pose for feedback timestamps", async () => {
    mockedGenerate.mockResolvedValueOnce(
      JSON.stringify({
        scores: [50, 51, 52, 53, 54, 55, 56, 57],
        feedback: fullFeedback().map((f) => ({ ...f, timestampSeconds: 2.5 })),
        summary: "Conservative.",
      })
    );

    const result = await scoreBiomechanicsWithGemini({
      shotType: "LEAVE",
      poseSummary: "t=2.50s idx=0 conf=0.9 | nose:x0.5 y0.2 v0.9",
      poseTracksForegroundBowlersRunUp: true,
    });

    expect(result.feedback.every((f) => f.timestampSeconds === null)).toBe(true);
    expect(result.feedback.every((f) => f.confidence === "low")).toBe(true);
  });

  it("pads truncated feedback and ignores garbage timestamps", async () => {
    mockedGenerate.mockResolvedValueOnce(
      JSON.stringify({
        scores: [70, 71, 72, 73, 74, 75, 76, 77],
        feedback: [
          {
            dimension: "backlift",
            score: 70,
            diagnosis: "High backlift.",
            timestampSeconds: Number.NaN,
            evidence: "rightWrist",
            drill: "Mirror drill.",
            confidence: "high",
          },
          {
            dimension: "weightTransfer",
            score: 71,
            diagnosis: "Late transfer.",
            timestampSeconds: 0.9,
            evidence: "hips",
            drill: "Step-and-drive.",
            confidence: "medium",
          },
        ],
      })
    );

    const result = await scoreBiomechanicsWithGemini({
      shotType: "COVER_DRIVE",
      poseSummary: "t=0.90s idx=1 conf=0.85 | leftHip:x0.4 y0.6 v0.9",
    });

    expect(result.feedback).toHaveLength(8);
    expect(result.feedback[0].timestampSeconds).toBeNull();
    expect(result.feedback[1].timestampSeconds).toBe(0.9);
    expect(result.feedback[7].dimension).toBe("shotSelection");
  });
});
