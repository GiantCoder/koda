import { describe, expect, it, vi, beforeEach } from "vitest";
import { awardAnalysisPoints } from "./points";

const userPointsFindUnique = vi.fn();
const userPointsUpsert = vi.fn();
const pointTransactionCreate = vi.fn();

vi.mock("@/prisma/client", () => ({
  prisma: {
    userPoints: {
      findUnique: (...args: unknown[]) => userPointsFindUnique(...args),
      upsert: (...args: unknown[]) => userPointsUpsert(...args),
    },
    pointTransaction: {
      create: (...args: unknown[]) => pointTransactionCreate(...args),
    },
  },
}));

describe("awardAnalysisPoints", () => {
  const userId = "user-1";
  const analysisId = "analysis-1";

  beforeEach(() => {
    vi.clearAllMocks();
    userPointsFindUnique.mockResolvedValue(null);
    userPointsUpsert.mockResolvedValue({});
    pointTransactionCreate.mockImplementation((args: { data: { reason: string } }) =>
      Promise.resolve({ id: `tx-${args.data.reason}`, ...args.data, createdAt: new Date() })
    );
  });

  it("awards base 10 points and creates ANALYSIS_COMPLETE transaction", async () => {
    // Mock existing user with practice today so we don't also award DAILY_BONUS (base only = 10)
    const today = new Date();
    userPointsFindUnique.mockResolvedValue({
      userId,
      lastPracticeDate: today,
      practiceStreakDays: 1,
    });
    const result = await awardAnalysisPoints(userId, {
      id: analysisId,
      gradeOverall: 65,
    });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(pointTransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId,
          points: 10,
          reason: "ANALYSIS_COMPLETE",
          referenceId: analysisId,
        }),
      })
    );
    // With existing user we hit update branch; total added is 10
    expect(userPointsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
        update: expect.objectContaining({
          totalPoints: { increment: 10 },
          currentSeasonPts: { increment: 10 },
          goldStarCount: { increment: 0 },
          practiceStreakDays: 1,
        }),
      })
    );
  });

  it("awards SCORE_TIER_B (+15) for gradeOverall >= 70", async () => {
    await awardAnalysisPoints(userId, { id: analysisId, gradeOverall: 75 });
    const reasons = pointTransactionCreate.mock.calls.map(
      (call: [ { data: { reason: string } } ]) => call[0].data.reason
    );
    expect(reasons).toContain("SCORE_TIER_B");
    const tierCall = pointTransactionCreate.mock.calls.find(
      (call: [ { data: { reason: string; points: number } } ]) => call[0].data.reason === "SCORE_TIER_B"
    );
    expect(tierCall?.[0].data.points).toBe(15);
  });

  it("awards SCORE_TIER_A (+25) for gradeOverall >= 80, not both B and A", async () => {
    await awardAnalysisPoints(userId, { id: analysisId, gradeOverall: 85 });
    const reasons = pointTransactionCreate.mock.calls.map(
      (call: [ { data: { reason: string } } ]) => call[0].data.reason
    );
    expect(reasons).toContain("SCORE_TIER_A");
    expect(reasons).not.toContain("SCORE_TIER_B");
    const tierCall = pointTransactionCreate.mock.calls.find(
      (call: [ { data: { reason: string; points: number } } ]) => call[0].data.reason === "SCORE_TIER_A"
    );
    expect(tierCall?.[0].data.points).toBe(25);
  });

  it("awards SCORE_TIER_GOLD (+50) for gradeOverall >= 90", async () => {
    await awardAnalysisPoints(userId, { id: analysisId, gradeOverall: 92 });
    const reasons = pointTransactionCreate.mock.calls.map(
      (call: [ { data: { reason: string } } ]) => call[0].data.reason
    );
    expect(reasons).toContain("SCORE_TIER_GOLD");
    expect(reasons).not.toContain("SCORE_TIER_A");
    const tierCall = pointTransactionCreate.mock.calls.find(
      (call: [ { data: { reason: string; points: number } } ]) => call[0].data.reason === "SCORE_TIER_GOLD"
    );
    expect(tierCall?.[0].data.points).toBe(50);
  });

  it("awards DAILY_BONUS (+5) when lastPracticeDate is not today", async () => {
    userPointsFindUnique.mockResolvedValue({
      userId,
      lastPracticeDate: new Date("2020-01-01"),
      practiceStreakDays: 1,
    });
    await awardAnalysisPoints(userId, { id: analysisId, gradeOverall: 60 });
    const reasons = pointTransactionCreate.mock.calls.map(
      (call: [ { data: { reason: string } } ]) => call[0].data.reason
    );
    expect(reasons).toContain("DAILY_BONUS");
  });

  it("increments goldStarCount when gradeOverall >= 90", async () => {
    await awardAnalysisPoints(userId, { id: analysisId, gradeOverall: 91 });
    expect(userPointsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          goldStarCount: { increment: 1 },
        }),
      })
    );
  });

  it("awards STREAK_7_DAY (+50) when streak reaches 7", async () => {
    userPointsFindUnique.mockResolvedValue({
      userId,
      lastPracticeDate: new Date(Date.now() - 86400000),
      practiceStreakDays: 6,
    });
    await awardAnalysisPoints(userId, { id: analysisId, gradeOverall: 70 });
    const reasons = pointTransactionCreate.mock.calls.map(
      (call: [ { data: { reason: string } } ]) => call[0].data.reason
    );
    expect(reasons).toContain("STREAK_7_DAY");
  });

  it("resets streak to 1 when last practice was not yesterday", async () => {
    userPointsFindUnique.mockResolvedValue({
      userId,
      lastPracticeDate: new Date(Date.now() - 86400000 * 3),
      practiceStreakDays: 5,
    });
    await awardAnalysisPoints(userId, { id: analysisId, gradeOverall: 60 });
    expect(userPointsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          practiceStreakDays: 1,
        }),
      })
    );
  });
});
