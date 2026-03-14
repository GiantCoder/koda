import { describe, expect, it, vi, beforeEach } from "vitest";
import { updatePlayerCardFromAnalyses } from "./card-update";

const analysisFindMany = vi.fn();
const playerCardFindUnique = vi.fn();
const userFindUnique = vi.fn();
const playerCardUpsert = vi.fn();

vi.mock("@/prisma/client", () => ({
  prisma: {
    analysis: { findMany: (...args: unknown[]) => analysisFindMany(...args) },
    playerCard: {
      findUnique: (...args: unknown[]) => playerCardFindUnique(...args),
      upsert: (...args: unknown[]) => playerCardUpsert(...args),
    },
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
  },
}));

describe("updatePlayerCardFromAnalyses", () => {
  const userId = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();
    userFindUnique.mockResolvedValue({ displayName: "Test User", name: "Test User" });
    playerCardUpsert.mockResolvedValue({});
  });

  it("upserts card with BRONZE tier and default stats when no analyses", async () => {
    analysisFindMany.mockResolvedValue([]);
    playerCardFindUnique.mockResolvedValue(null);

    const result = await updatePlayerCardFromAnalyses(userId);

    expect(result).toEqual({
      cardUpdated: true,
      tierChanged: true, // no previous card → first tier set counts as change
      previousTier: null,
      newTier: "BRONZE",
    });
    expect(playerCardUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
        create: expect.objectContaining({
          userId,
          displayName: "Test User",
          tier: "BRONZE",
          role: "BAT",
          sportIcon: "BAT_ICON",
          statTec: 50,
          statPow: 50,
          statTim: 50,
          statCon: 50,
          statPac: 50,
          statFie: 50,
        }),
      })
    );
  });

  it("computes SILVER tier from average grade 70", async () => {
    analysisFindMany.mockResolvedValue([
      { gradeOverall: 70, scoreBacklift: 70, scoreHeadPosition: 70, scoreBalance: 70, scoreWeightTransfer: 70, scoreTiming: 70, scoreShotSelection: 70, scoreFootwork: 70, scoreFollowThrough: 70 },
    ]);
    playerCardFindUnique.mockResolvedValue(null);

    const result = await updatePlayerCardFromAnalyses(userId);

    expect(result?.newTier).toBe("SILVER");
    expect(result?.tierChanged).toBe(true); // no previous card → first tier set counts as change
    expect(playerCardUpsert.mock.calls[0][0].create.tier).toBe("SILVER");
  });

  it("computes GOLD tier from average grade 80", async () => {
    analysisFindMany.mockResolvedValue([
      { gradeOverall: 80, scoreBacklift: 80, scoreHeadPosition: 80, scoreBalance: 80, scoreWeightTransfer: 80, scoreTiming: 80, scoreShotSelection: 80, scoreFootwork: 80, scoreFollowThrough: 80 },
    ]);
    playerCardFindUnique.mockResolvedValue(null);

    const result = await updatePlayerCardFromAnalyses(userId);

    expect(result?.newTier).toBe("GOLD");
    expect(playerCardUpsert.mock.calls[0][0].create.tier).toBe("GOLD");
  });

  it("returns tierChanged true when previous tier was BRONZE and new is SILVER", async () => {
    analysisFindMany.mockResolvedValue([
      { gradeOverall: 70, scoreBacklift: 70, scoreHeadPosition: 70, scoreBalance: 70, scoreWeightTransfer: 70, scoreTiming: 70, scoreShotSelection: 70, scoreFootwork: 70, scoreFollowThrough: 70 },
    ]);
    playerCardFindUnique.mockResolvedValue({
      userId,
      displayName: "Existing",
      tier: "BRONZE",
      role: "BAT",
      sportIcon: "BAT_ICON",
      statTec: 50,
      statPow: 50,
      statTim: 50,
      statCon: 50,
      statPac: 50,
      statFie: 50,
      profilePhotoUrl: null,
      backgroundUrl: null,
      backgroundMode: "DEFAULT",
    });

    const result = await updatePlayerCardFromAnalyses(userId);

    expect(result?.tierChanged).toBe(true);
    expect(result?.previousTier).toBe("BRONZE");
    expect(result?.newTier).toBe("SILVER");
    expect(playerCardUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          tier: "SILVER",
        }),
      })
    );
  });

  it("preserves existing displayName when updating", async () => {
    analysisFindMany.mockResolvedValue([
      { gradeOverall: 65, scoreBacklift: 65, scoreHeadPosition: 65, scoreBalance: 65, scoreWeightTransfer: 65, scoreTiming: 65, scoreShotSelection: 65, scoreFootwork: 65, scoreFollowThrough: 65 },
    ]);
    playerCardFindUnique.mockResolvedValue({
      userId,
      displayName: "Custom Name",
      tier: "BRONZE",
      role: "BWL",
      sportIcon: "BALL_ICON",
      statTec: 50,
      statPow: 50,
      statTim: 50,
      statCon: 50,
      statPac: 50,
      statFie: 50,
      profilePhotoUrl: null,
      backgroundUrl: null,
      backgroundMode: "DEFAULT",
    });

    await updatePlayerCardFromAnalyses(userId);

    expect(playerCardUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          tier: "SILVER",
          statTec: expect.any(Number),
          statPow: expect.any(Number),
        }),
      })
    );
    expect(playerCardUpsert.mock.calls[0][0].update).not.toMatchObject({
      displayName: expect.anything(),
      role: expect.anything(),
      sportIcon: expect.anything(),
    });
  });
});
