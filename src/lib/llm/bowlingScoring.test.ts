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

const mockedGenerate = vi.mocked(generateContentTextWithRetryAndFallback);

describe("scoreBowlingBiomechanicsWithGemini", () => {
  beforeEach(() => {
    mockedGenerate.mockReset();
  });

  it("clamps and pads scores to exactly 8 slots", async () => {
    mockedGenerate.mockResolvedValueOnce(
      JSON.stringify({
        scores: [101, -5, 66.6, 80],
      })
    );

    const result = await scoreBowlingBiomechanicsWithGemini({
      bowlingArm: "RIGHT_ARM",
      bowlingType: "PACE",
      deliveryType: "GOOD_LENGTH",
      analysisId: "an-1",
    });

    expect(result.scores).toHaveLength(8);
    expect(result.scores[0]).toBe(100);
    expect(result.scores[1]).toBe(0);
    expect(result.scores[2]).toBe(67);
    expect(result.scores[3]).toBe(80);
    expect(result.scores.slice(4)).toEqual([0, 0, 0, 0]);
  });

  it("returns zeros when scores are missing", async () => {
    mockedGenerate.mockResolvedValueOnce(JSON.stringify({}));

    const result = await scoreBowlingBiomechanicsWithGemini({
      bowlingArm: "LEFT_ARM",
      bowlingType: "SPIN",
      deliveryType: "OFF_BREAK",
    });

    expect(result.scores).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
