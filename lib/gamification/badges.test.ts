import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkAndAwardBadges, awardBadgePoints } from "./badges";
import type { Analysis, BadgeDefinition } from "@prisma/client";

const userBadgeFindMany = vi.fn();
const userBadgeCreate = vi.fn();
const badgeDefinitionFindMany = vi.fn();
const analysisCount = vi.fn();
const analysisGroupBy = vi.fn();
const userPointsFindUnique = vi.fn();
const userPointsUpsert = vi.fn();
const pointTransactionCreate = vi.fn();

vi.mock("@/prisma/client", () => ({
  prisma: {
    userBadge: {
      findMany: (...args: unknown[]) => userBadgeFindMany(...args),
      create: (...args: unknown[]) => userBadgeCreate(...args),
    },
    badgeDefinition: {
      findMany: (...args: unknown[]) => badgeDefinitionFindMany(...args),
    },
    analysis: {
      count: (...args: unknown[]) => analysisCount(...args),
      groupBy: (...args: unknown[]) => analysisGroupBy(...args),
    },
    userPoints: {
      findUnique: (...args: unknown[]) => userPointsFindUnique(...args),
      upsert: (...args: unknown[]) => userPointsUpsert(...args),
    },
    pointTransaction: {
      create: (...args: unknown[]) => pointTransactionCreate(...args),
    },
  },
}));

const mockBadgeDef = (key: string, pointsValue = 25): BadgeDefinition =>
  ({
    id: `def-${key}`,
    key,
    name: key,
    description: "",
    rarity: "COMMON",
    iconKey: `badge-${key}`,
    pointsValue,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
  }) as BadgeDefinition;

const userId = "user-1";

describe("checkAndAwardBadges", () => {
  const baseAnalysis = {
    id: "analysis-1",
    videoId: "v1",
    status: "COMPLETE" as const,
    shotType: "COVER_DRIVE" as const,
    gradeOverall: 85,
    scoreHeadPosition: 90,
    scoreBalance: 92,
    scoreTiming: 88,
    scoreWeightTransfer: 87,
    scoreFollowThrough: 86,
    scoreBacklift: null,
    scoreFootwork: null,
    scoreShotSelection: null,
    shotConfidence: null,
    gradeLetter: null,
    coachingTips: null,
    poseDataPath: null,
    skeletonOverlayPath: null,
    rawGeminiResponse: null,
    rawOpenAiResponse: null,
    analysisVersion: "1.0",
    processingMs: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Analysis;

  beforeEach(() => {
    vi.clearAllMocks();
    userBadgeFindMany.mockResolvedValue([]);
    badgeDefinitionFindMany.mockResolvedValue([
      mockBadgeDef("FIRST_TOUCH", 10),
      mockBadgeDef("GOLD_STANDARD", 25),
      mockBadgeDef("PERFECT_STANCE", 75),
      mockBadgeDef("TIMING_KING", 75),
      mockBadgeDef("POWER_PLAYER", 50),
      mockBadgeDef("DAILY_DRILLS", 25),
      mockBadgeDef("WEEK_WARRIOR", 50),
      mockBadgeDef("IRON_WILL", 200),
      mockBadgeDef("VOLUME_BATTER", 100),
      mockBadgeDef("SHOT_ARTIST", 150),
      mockBadgeDef("HAT_TRICK", 50),
      mockBadgeDef("TECHNIQUE_MASTER", 150),
    ]);
    analysisCount.mockResolvedValue(1);
    analysisGroupBy.mockResolvedValue([{ shotType: "COVER_DRIVE", _count: 1 }]);
    userPointsFindUnique.mockResolvedValue({ practiceStreakDays: 0 });
    userBadgeCreate.mockImplementation((args: { data: { badgeDefinitionId: string } }) => {
      const key = args.data.badgeDefinitionId.replace("def-", "");
      return Promise.resolve({
        id: `ub-${args.data.badgeDefinitionId}`,
        userId,
        badgeDefinitionId: args.data.badgeDefinitionId,
        earnedAt: new Date(),
        referenceId: baseAnalysis.id,
        badgeDefinition: mockBadgeDef(key),
      });
    });
    userPointsUpsert.mockResolvedValue({});
    pointTransactionCreate.mockResolvedValue({});
  });

  it("awards FIRST_TOUCH when complete count is 1", async () => {
    analysisCount.mockResolvedValue(1);
    const result = await checkAndAwardBadges(userId, baseAnalysis);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(userBadgeCreate).toHaveBeenCalled();
    const firstTouchCall = userBadgeCreate.mock.calls.find(
      (call: [ { data: { badgeDefinitionId: string } } ]) =>
        call[0].data.badgeDefinitionId === "def-FIRST_TOUCH"
    );
    expect(firstTouchCall).toBeDefined();
  });

  it("awards GOLD_STANDARD when gradeOverall >= 90", async () => {
    userBadgeFindMany.mockResolvedValue([{ badgeDefinition: { key: "FIRST_TOUCH" } }]);
    analysisCount.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
    const analysisWith90 = { ...baseAnalysis, gradeOverall: 91 };
    const result = await checkAndAwardBadges(userId, analysisWith90 as Analysis);
    const goldCall = userBadgeCreate.mock.calls.find(
      (call: [ { data: { badgeDefinitionId: string } } ]) =>
        call[0].data.badgeDefinitionId === "def-GOLD_STANDARD"
    );
    expect(goldCall).toBeDefined();
    expect(result.some((ub) => ub.badgeDefinition.key === "GOLD_STANDARD")).toBe(true);
  });

  it("awards PERFECT_STANCE when scoreHeadPosition and scoreBalance >= 95", async () => {
    userBadgeFindMany.mockResolvedValue([]);
    const analysisStance = {
      ...baseAnalysis,
      scoreHeadPosition: 96,
      scoreBalance: 95,
    } as Analysis;
    await checkAndAwardBadges(userId, analysisStance);
    const stanceCall = userBadgeCreate.mock.calls.find(
      (call: [ { data: { badgeDefinitionId: string } } ]) =>
        call[0].data.badgeDefinitionId === "def-PERFECT_STANCE"
    );
    expect(stanceCall).toBeDefined();
  });

  it("does not award badge user already has", async () => {
    userBadgeFindMany.mockResolvedValue([{ badgeDefinition: { key: "FIRST_TOUCH" } }]);
    analysisCount.mockResolvedValue(1);
    await checkAndAwardBadges(userId, baseAnalysis);
    const firstTouchCalls = userBadgeCreate.mock.calls.filter(
      (call: [ { data: { badgeDefinitionId: string } } ]) =>
        call[0].data.badgeDefinitionId === "def-FIRST_TOUCH"
    );
    expect(firstTouchCalls.length).toBe(0);
  });
});

describe("awardBadgePoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userPointsUpsert.mockResolvedValue({});
    pointTransactionCreate.mockResolvedValue({});
  });

  it("creates BADGE_EARNED transaction and upserts UserPoints", async () => {
    const def = mockBadgeDef("GOLD_STANDARD", 25);
    await awardBadgePoints(userId, def, "ub-1");
    expect(userPointsUpsert).toHaveBeenCalled();
    expect(pointTransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: "BADGE_EARNED",
          points: 25,
          referenceId: "ub-1",
        }),
      })
    );
  });
});
