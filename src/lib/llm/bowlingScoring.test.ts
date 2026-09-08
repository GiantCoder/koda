import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./gemini-retry", () => ({
  generateContentTextWithRetryAndFallback: vi.fn(),
}));

vi.mock("./gemini", () => ({
  modelNameForTask: vi.fn(() => "test-model"),
}));

vi.mock("@/src/lib/analysis/pipeline-log", () => ({
  logGeminiRequest: vi.fn(),
}));

import { generateContentTextWithRetryAndFallback } from "./gemini-retry";
import { scoreBowlingBiomechanicsWithGemini } from "./bowlingScoring";
import { BOWLING_SCORE_DIMENSIONS } from "@/src/types/technical-feedback";

const mockedGenerate = vi.mocked(generateContentTextWithRetryAndFallback);

function fullFeedback(overrides: Partial<Record<string, unknown>>[] = []) {
  return BOWLING_SCORE_DIMENSIONS.map((dimension, i) => ({
    dimension,
    score: 70 + i,
    diagnosis: `At t=1.2s, ${dimension} cue observed.`,
    timestampSeconds: 1.2,
    evidence: "leftWrist height",
    drill: "Repeat side-on drills focusing on this phase.",
    confidence: "high" as const,
    ...overrides[i],
  }));
}

describe("scoreBowlingBiomechanicsWithGemini", () => {
  beforeEach(() => {
    mockedGenerate.mockReset();
  });

  it("clamps and pads scores to exactly 8 slots and returns feedback", async () => {
    mockedGenerate.mockResolvedValueOnce(
      JSON.stringify({
        scores: [101, -5, 66.6, 80],
        feedback: fullFeedback(),
        summary: "Overall solid pace action with early release.",
      })
    );

    const result = await scoreBowlingBiomechanicsWithGemini({
      bowlingArm: "RIGHT_ARM",
      bowlingType: "PACE",
      deliveryType: "GOOD_LENGTH",
      poseSummary: "t=1.20s idx=0 conf=0.9 | leftWrist:x0.4 y0.3 v0.9",
      analysisId: "an-1",
    });

    expect(result.scores).toHaveLength(8);
    expect(result.scores[0]).toBe(100);
    expect(result.scores[1]).toBe(0);
    expect(result.scores[2]).toBe(67);
    expect(result.scores[3]).toBe(80);
    expect(result.scores.slice(4)).toEqual([0, 0, 0, 0]);
    expect(result.feedback).toHaveLength(8);
    expect(result.feedback.map((f) => f.dimension)).toEqual([...BOWLING_SCORE_DIMENSIONS]);
    expect(result.summary).toContain("early release");
  });

  it("returns zeros and repaired low-confidence feedback when scores/feedback missing", async () => {
    mockedGenerate.mockResolvedValueOnce(JSON.stringify({}));

    const result = await scoreBowlingBiomechanicsWithGemini({
      bowlingArm: "LEFT_ARM",
      bowlingType: "SPIN",
      deliveryType: "OFF_BREAK",
    });

    expect(result.scores).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(result.feedback).toHaveLength(8);
    expect(result.feedback.every((f) => f.confidence === "low")).toBe(true);
    expect(result.feedback.every((f) => f.timestampSeconds === null)).toBe(true);
  });

  it("repairs wrong-length feedback and garbage timestampSeconds", async () => {
    mockedGenerate.mockResolvedValueOnce(
      JSON.stringify({
        scores: [70, 71, 72, 73, 74, 75, 76, 77],
        feedback: [
          {
            dimension: "runUpRhythm",
            score: 70,
            diagnosis: "Smooth approach.",
            timestampSeconds: "not-a-number",
            evidence: "hips",
            drill: "Mark run-up.",
            confidence: "maybe",
          },
        ],
        summary: "Partial feedback response.",
      })
    );

    const result = await scoreBowlingBiomechanicsWithGemini({
      bowlingArm: "RIGHT_ARM",
      bowlingType: "PACE",
      deliveryType: "YORKER",
      poseSummary: "t=0.50s idx=0 conf=0.8 | rightAnkle:x0.5 y0.9 v0.9",
    });

    expect(result.feedback).toHaveLength(8);
    expect(result.feedback[0].timestampSeconds).toBeNull();
    expect(result.feedback[0].confidence).toBe("medium");
    expect(result.feedback[7].dimension).toBe("balance");
    expect(result.feedback[7].score).toBe(77);
  });

  it("passes sampled frames into the Gemini request when provided", async () => {
    mockedGenerate.mockResolvedValueOnce(
      JSON.stringify({
        scores: [70, 71, 72, 73, 74, 75, 76, 77],
        feedback: fullFeedback(),
        summary: "With frames.",
      })
    );

    const frames = Array.from({ length: 20 }, (_, i) => `frame-${i}`);
    await scoreBowlingBiomechanicsWithGemini({
      bowlingArm: "RIGHT_ARM",
      bowlingType: "PACE",
      deliveryType: "GOOD_LENGTH",
      framesBase64: frames,
      poseSummary: "t=1.00s idx=0 conf=0.9 | leftWrist:x0.4 y0.3 v0.9",
    });

    const call = mockedGenerate.mock.calls[0];
    const parts = (call[2] as { contents: { parts: unknown[] }[] }).contents[0].parts;
    const imageParts = parts.filter(
      (p): p is { inlineData: { data: string } } =>
        typeof p === "object" && p !== null && "inlineData" in p
    );
    expect(imageParts.length).toBeLessThanOrEqual(12);
    expect(imageParts.length).toBeGreaterThan(0);
  });
});
