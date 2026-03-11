import type { PointTransaction } from "@prisma/client";
import { prisma } from "@/prisma/client";

const BASE_POINTS = 10;
const DAILY_BONUS_POINTS = 5;
const STREAK_7_DAY_POINTS = 50;
const GOLD_STAR_THRESHOLD = 90;

/** Score tier: only the highest applicable tier is awarded (no stacking). */
const SCORE_TIERS: Array<{ minScore: number; points: number; reason: string }> = [
  { minScore: 90, points: 50, reason: "SCORE_TIER_GOLD" },
  { minScore: 80, points: 25, reason: "SCORE_TIER_A" },
  { minScore: 70, points: 15, reason: "SCORE_TIER_B" },
];

export interface AnalysisForPoints {
  id: string;
  gradeOverall: number | null;
}

/**
 * Award points when an analysis completes. Creates PointTransaction records,
 * upserts UserPoints (totalPoints, currentSeasonPts, goldStarCount, streak, lastPracticeDate).
 * Returns all created PointTransaction records.
 */
export async function awardAnalysisPoints(
  userId: string,
  analysis: AnalysisForPoints
): Promise<PointTransaction[]> {
  const grade = analysis.gradeOverall ?? 0;
  const existing = await prisma.userPoints.findUnique({ where: { userId } });
  const today = toDateOnly(new Date());
  const lastPractice = existing?.lastPracticeDate
    ? toDateOnly(existing.lastPracticeDate)
    : null;
  const isFirstToday = lastPractice !== today;

  let totalToAdd = BASE_POINTS;
  const toCreate: Array<{ points: number; reason: string; metadata?: object }> = [
    { points: BASE_POINTS, reason: "ANALYSIS_COMPLETE" },
  ];

  const tier = SCORE_TIERS.find((t) => grade >= t.minScore);
  if (tier) {
    totalToAdd += tier.points;
    toCreate.push({ points: tier.points, reason: tier.reason });
  }
  if (isFirstToday) {
    totalToAdd += DAILY_BONUS_POINTS;
    toCreate.push({ points: DAILY_BONUS_POINTS, reason: "DAILY_BONUS" });
  }

  const yesterday = toDateOnly(new Date(Date.now() - 86400000));
  let newStreakDays = 1;
  if (existing?.lastPracticeDate) {
    const last = toDateOnly(existing.lastPracticeDate);
    if (last === today) {
      newStreakDays = existing.practiceStreakDays;
    } else if (last === yesterday) {
      newStreakDays = existing.practiceStreakDays + 1;
    }
  }
  const wasBelowSeven = (existing?.practiceStreakDays ?? 0) < 7;
  const nowSeven = newStreakDays >= 7;
  if (wasBelowSeven && nowSeven) {
    totalToAdd += STREAK_7_DAY_POINTS;
    toCreate.push({
      points: STREAK_7_DAY_POINTS,
      reason: "STREAK_7_DAY",
      metadata: { streakDays: 7 },
    });
  }

  const goldStarIncrement = grade >= GOLD_STAR_THRESHOLD ? 1 : 0;

  await prisma.userPoints.upsert({
    where: { userId },
    create: {
      userId,
      totalPoints: totalToAdd,
      currentSeasonPts: totalToAdd,
      goldStarCount: goldStarIncrement,
      practiceStreakDays: newStreakDays,
      lastPracticeDate: new Date(),
    },
    update: {
      totalPoints: { increment: totalToAdd },
      currentSeasonPts: { increment: totalToAdd },
      goldStarCount: { increment: goldStarIncrement },
      practiceStreakDays: newStreakDays,
      lastPracticeDate: new Date(),
    },
  });

  const transactions: PointTransaction[] = [];
  for (const item of toCreate) {
    const tx = await prisma.pointTransaction.create({
      data: {
        userId,
        points: item.points,
        reason: item.reason,
        referenceId: analysis.id,
        metadata: item.metadata ?? undefined,
      },
    });
    transactions.push(tx);
  }
  return transactions;
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}
