import { describe, expect, it } from "vitest";
import { deriveCardStats, deriveCardTier } from "./player-card-stats";

describe("deriveCardStats", () => {
  it("returns correct averages and clamps to 1-99", () => {
    const result = deriveCardStats([
      {
        scoreBacklift: 101,
        scoreHeadPosition: 100,
        scoreBalance: 100,
        scoreWeightTransfer: 0,
        scoreTiming: 104,
        scoreShotSelection: -4,
        scoreFootwork: 68.4,
        scoreFollowThrough: 50.5,
      },
      {
        scoreBacklift: 95,
        scoreHeadPosition: 93,
        scoreBalance: 91,
        scoreWeightTransfer: 46,
        scoreTiming: 82,
        scoreShotSelection: 62,
        scoreFootwork: 81.6,
        scoreFollowThrough: 77.5,
      },
    ]);

    expect(result).toEqual({
      statTec: 97,
      statPow: 23,
      statTim: 93,
      statCon: 29,
      statPac: 75,
      statFie: 64,
    });
  });

  it("returns 50 for all stats when all scores are null", () => {
    const result = deriveCardStats([
      {
        scoreBacklift: null,
        scoreHeadPosition: null,
        scoreBalance: null,
        scoreWeightTransfer: null,
        scoreTiming: null,
        scoreShotSelection: null,
        scoreFootwork: null,
        scoreFollowThrough: null,
      },
    ]);

    expect(result).toEqual({
      statTec: 50,
      statPow: 50,
      statTim: 50,
      statCon: 50,
      statPac: 50,
      statFie: 50,
    });
  });

  it("returns 50 for all stats when analyses are empty", () => {
    const result = deriveCardStats([]);

    expect(result).toEqual({
      statTec: 50,
      statPow: 50,
      statTim: 50,
      statCon: 50,
      statPac: 50,
      statFie: 50,
    });
  });
});

describe("deriveCardTier", () => {
  it("handles boundaries", () => {
    expect(deriveCardTier(64)).toBe("BRONZE");
    expect(deriveCardTier(65)).toBe("SILVER");
    expect(deriveCardTier(74)).toBe("SILVER");
    expect(deriveCardTier(75)).toBe("GOLD");
    expect(deriveCardTier(87)).toBe("GOLD");
    expect(deriveCardTier(88)).toBe("ELITE");
    expect(deriveCardTier(100)).toBe("ELITE");
  });
});
