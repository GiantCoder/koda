import type { Analysis, BadgeDefinition, UserBadge } from "@prisma/client";
import { ShotType } from "@prisma/client";
import { prisma } from "@/prisma/client";

/** Non-social badge keys (awarded by this service). LEAGUE_CHAMPION, CHALLENGE_WINNER, FAN_FAVOURITE are handled elsewhere. */
const NON_SOCIAL_BADGE_KEYS = [
  "FIRST_TOUCH",
  "GOLD_STANDARD",
  "HAT_TRICK",
  "TECHNIQUE_MASTER",
  "PERFECT_STANCE",
  "TIMING_KING",
  "POWER_PLAYER",
  "DAILY_DRILLS",
  "WEEK_WARRIOR",
  "IRON_WILL",
  "VOLUME_BATTER",
  "SHOT_ARTIST",
] as const;

/** 14 shot types (excluding UNKNOWN) for TECHNIQUE_MASTER and SHOT_ARTIST. */
const SHOT_TYPES_FOR_BADGES = (Object.values(ShotType) as string[]).filter(
  (s) => s !== "UNKNOWN"
);

/**
 * Award badge points as a PointTransaction. Call after creating a UserBadge.
 */
export async function awardBadgePoints(
  userId: string,
  badgeDefinition: BadgeDefinition,
  userBadgeId: string
): Promise<void> {
  await prisma.userPoints.upsert({
    where: { userId },
    create: {
      userId,
      totalPoints: badgeDefinition.pointsValue,
      currentSeasonPts: badgeDefinition.pointsValue,
    },
    update: {
      totalPoints: { increment: badgeDefinition.pointsValue },
      currentSeasonPts: { increment: badgeDefinition.pointsValue },
    },
  });
  await prisma.pointTransaction.create({
    data: {
      userId,
      points: badgeDefinition.pointsValue,
      reason: "BADGE_EARNED",
      referenceId: userBadgeId,
      metadata: { badgeKey: badgeDefinition.key },
    },
  });
}

/**
 * Check which badges the user has newly unlocked after an analysis. Creates UserBadge,
 * calls awardBadgePoints for each. Returns newly awarded UserBadge records (with badgeDefinition).
 */
export async function checkAndAwardBadges(
  userId: string,
  analysis: Analysis
): Promise<Array<UserBadge & { badgeDefinition: BadgeDefinition }>> {
  const [existingUserBadges, definitions, completeCount, goldCount, analysesByShot, userPoints] =
    await Promise.all([
      prisma.userBadge.findMany({
        where: { userId },
        select: { badgeDefinitionId: true, badgeDefinition: { select: { key: true } } },
      }),
      prisma.badgeDefinition.findMany({
        where: { key: { in: [...NON_SOCIAL_BADGE_KEYS] }, isActive: true },
      }),
      prisma.analysis.count({
        where: {
          video: { userId },
          status: "COMPLETE",
        },
      }),
      prisma.analysis.count({
        where: {
          video: { userId },
          status: "COMPLETE",
          gradeOverall: { gte: 90 },
        },
      }),
      prisma.analysis.groupBy({
        by: ["shotType"],
        where: {
          video: { userId },
          status: "COMPLETE",
          shotType: { not: null },
        },
        _count: true,
      }),
      prisma.userPoints.findUnique({
        where: { userId },
        select: { practiceStreakDays: true },
      }),
    ]);

  const earnedKeys = new Set(existingUserBadges.map((ub) => ub.badgeDefinition.key));
  const defMap = new Map(definitions.map((d) => [d.key, d]));

  const grade = analysis.gradeOverall ?? 0;
  const headPos = analysis.scoreHeadPosition ?? 0;
  const balance = analysis.scoreBalance ?? 0;
  const timing = analysis.scoreTiming ?? 0;
  const weightTransfer = analysis.scoreWeightTransfer ?? 0;
  const followThrough = analysis.scoreFollowThrough ?? 0;
  const streakDays = userPoints?.practiceStreakDays ?? 0;

  const toAward: string[] = [];

  if (!earnedKeys.has("FIRST_TOUCH") && completeCount === 1) toAward.push("FIRST_TOUCH");
  if (!earnedKeys.has("GOLD_STANDARD") && grade >= 90) toAward.push("GOLD_STANDARD");
  if (!earnedKeys.has("HAT_TRICK") && goldCount >= 3) toAward.push("HAT_TRICK");
  if (!earnedKeys.has("PERFECT_STANCE") && headPos >= 95 && balance >= 95)
    toAward.push("PERFECT_STANCE");
  if (!earnedKeys.has("TIMING_KING") && timing >= 95) toAward.push("TIMING_KING");
  if (
    !earnedKeys.has("POWER_PLAYER") &&
    weightTransfer >= 90 &&
    followThrough >= 90
  )
    toAward.push("POWER_PLAYER");
  if (!earnedKeys.has("DAILY_DRILLS") && streakDays >= 3) toAward.push("DAILY_DRILLS");
  if (!earnedKeys.has("WEEK_WARRIOR") && streakDays >= 7) toAward.push("WEEK_WARRIOR");
  if (!earnedKeys.has("IRON_WILL") && streakDays >= 30) toAward.push("IRON_WILL");
  if (!earnedKeys.has("VOLUME_BATTER") && completeCount >= 50) toAward.push("VOLUME_BATTER");

  const shotTypesWithAnalysis = new Set(
    analysesByShot.map((g) => g.shotType).filter(Boolean) as string[]
  );
  if (analysis.shotType) shotTypesWithAnalysis.add(analysis.shotType);
  const all14Shots = SHOT_TYPES_FOR_BADGES.every((s) => shotTypesWithAnalysis.has(s));
  if (!earnedKeys.has("SHOT_ARTIST") && all14Shots) toAward.push("SHOT_ARTIST");

  // TECHNIQUE_MASTER: at least one analysis scoring 90+ per shot type
  let techniqueMasterOk = false;
  if (!earnedKeys.has("TECHNIQUE_MASTER")) {
    const goldByShot = await prisma.analysis.groupBy({
      by: ["shotType"],
      where: {
        video: { userId },
        status: "COMPLETE",
        gradeOverall: { gte: 90 },
        shotType: { not: null },
      },
    });
    const shotTypesWith90 = new Set(
      goldByShot.map((g) => g.shotType).filter(Boolean) as string[]
    );
    techniqueMasterOk = SHOT_TYPES_FOR_BADGES.every((s) => shotTypesWith90.has(s));
    if (techniqueMasterOk) toAward.push("TECHNIQUE_MASTER");
  }

  const result: Array<UserBadge & { badgeDefinition: BadgeDefinition }> = [];
  for (const key of toAward) {
    const def = defMap.get(key);
    if (!def) continue;
    const userBadge = await prisma.userBadge.create({
      data: {
        userId,
        badgeDefinitionId: def.id,
        referenceId: analysis.id,
      },
      include: { badgeDefinition: true },
    });
    await awardBadgePoints(userId, def, userBadge.id);
    result.push(userBadge);
  }
  return result;
}
