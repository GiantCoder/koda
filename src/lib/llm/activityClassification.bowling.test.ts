import { describe, expect, it } from "vitest";

/**
 * Mirrors the defensive parse logic in activityClassification for bowling fields.
 * Kept as a pure helper test so we can validate defaults without calling Gemini.
 */
function parseBowlingGateFields(parsed: {
  bowlerActionVisible?: unknown;
  bowlingConfidence?: unknown;
  activityType?: string;
}): { bowlerActionVisible: boolean; bowlingConfidence: number; isBowling: boolean } {
  const threshold = 0.65;
  const bowlingConfidence =
    typeof parsed.bowlingConfidence === "number" && Number.isFinite(parsed.bowlingConfidence)
      ? Math.max(0, Math.min(1, parsed.bowlingConfidence))
      : 0;
  const bowlerActionVisible =
    typeof parsed.bowlerActionVisible === "boolean"
      ? parsed.bowlerActionVisible
      : parsed.activityType === "BOWLING";
  const isBowling = bowlerActionVisible && bowlingConfidence >= threshold;
  return { bowlerActionVisible, bowlingConfidence, isBowling };
}

describe("activity gate bowling fields", () => {
  it("derives isBowling from bowlerActionVisible + bowlingConfidence", () => {
    expect(
      parseBowlingGateFields({
        bowlerActionVisible: true,
        bowlingConfidence: 0.88,
      })
    ).toEqual({
      bowlerActionVisible: true,
      bowlingConfidence: 0.88,
      isBowling: true,
    });
  });

  it("defaults missing fields safely", () => {
    expect(parseBowlingGateFields({})).toEqual({
      bowlerActionVisible: false,
      bowlingConfidence: 0,
      isBowling: false,
    });
  });

  it("falls back bowlerActionVisible from activityType BOWLING", () => {
    expect(
      parseBowlingGateFields({
        activityType: "BOWLING",
        bowlingConfidence: 0.7,
      }).bowlerActionVisible
    ).toBe(true);
  });
});
