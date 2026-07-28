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
import { classifyBowlingActionWithGemini } from "./bowlingClassification";

const mockedGenerate = vi.mocked(generateContentTextWithRetryAndFallback);

describe("classifyBowlingActionWithGemini", () => {
  beforeEach(() => {
    mockedGenerate.mockReset();
  });

  it("parses a valid bowling classification response", async () => {
    mockedGenerate.mockResolvedValueOnce(
      JSON.stringify({
        bowlingArm: "RIGHT_ARM",
        bowlingType: "PACE",
        deliveryType: "YORKER",
        confidence: 0.82,
        reasons: ["Clear right-arm release"],
        noBowlerVisible: false,
      })
    );

    const result = await classifyBowlingActionWithGemini({
      videoId: "vid-1",
      analysisId: "an-1",
      framesBase64: ["frame1", "frame2", "frame3"],
    });

    expect(result.bowlingArm).toBe("RIGHT_ARM");
    expect(result.bowlingType).toBe("PACE");
    expect(result.deliveryType).toBe("YORKER");
    expect(result.confidence).toBe(0.82);
    expect(result.noBowlerVisible).toBe(false);
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
  });

  it("retries once then falls back on unparseable JSON", async () => {
    mockedGenerate
      .mockResolvedValueOnce("not-json")
      .mockResolvedValueOnce("still-not-json");

    const result = await classifyBowlingActionWithGemini({
      videoId: "vid-1",
      analysisId: "an-1",
      framesBase64: ["frame1"],
    });

    expect(mockedGenerate).toHaveBeenCalledTimes(2);
    expect(result.bowlingArm).toBe("UNKNOWN");
    expect(result.deliveryType).toBe("UNKNOWN");
    expect(result.noBowlerVisible).toBe(true);
    expect(result.confidence).toBe(0);
  });

  it("succeeds on retry after first parse failure", async () => {
    mockedGenerate
      .mockResolvedValueOnce("broken")
      .mockResolvedValueOnce(
        JSON.stringify({
          bowlingArm: "LEFT_ARM",
          bowlingType: "SPIN",
          deliveryType: "GOOGLY",
          confidence: 0.7,
          reasons: ["Wrist position"],
          noBowlerVisible: false,
        })
      );

    const result = await classifyBowlingActionWithGemini({
      videoId: "vid-1",
      analysisId: "an-1",
      framesBase64: ["frame1", "frame2"],
    });

    expect(mockedGenerate).toHaveBeenCalledTimes(2);
    expect(result.bowlingArm).toBe("LEFT_ARM");
    expect(result.deliveryType).toBe("GOOGLY");
    expect(result.noBowlerVisible).toBe(false);
  });
});
