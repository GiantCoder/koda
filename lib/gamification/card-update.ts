import type { CardTier } from "@prisma/client";
import { prisma } from "@/prisma/client";
import { deriveCardStats, deriveCardTier } from "@/lib/player-card-stats";

export interface CardUpdateResult {
  cardUpdated: boolean;
  tierChanged: boolean;
  previousTier: CardTier | null;
  newTier: CardTier;
}

/**
 * Recompute player card tier and stats from all complete analyses and upsert PlayerCard.
 * Preserves user customizations (displayName, role, sportIcon, profilePhotoUrl, backgroundUrl, backgroundMode).
 * Returns result so callers can send tier-change and CARD_STAT_UPDATE notifications.
 */
export async function updatePlayerCardFromAnalyses(
  userId: string
): Promise<CardUpdateResult | null> {
  const [analyses, existingCard, user] = await Promise.all([
    prisma.analysis.findMany({
      where: {
        status: "COMPLETE",
        video: { userId, isDeleted: false },
      },
      select: {
        scoreBacklift: true,
        scoreHeadPosition: true,
        scoreBalance: true,
        scoreWeightTransfer: true,
        scoreTiming: true,
        scoreShotSelection: true,
        scoreFootwork: true,
        scoreFollowThrough: true,
        gradeOverall: true,
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.playerCard.findUnique({
      where: { userId },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, name: true },
    }),
  ]);

  const stats = deriveCardStats(analyses);
  const validGrades = analyses
    .map((a) => a.gradeOverall)
    .filter((g): g is number => g != null);
  const avgGrade =
    validGrades.length > 0
      ? validGrades.reduce((sum, g) => sum + g, 0) / validGrades.length
      : null;
  const newTier = deriveCardTier(avgGrade);

  const previousTier = existingCard?.tier ?? null;
  const tierChanged = previousTier !== newTier;

  const displayName =
    existingCard?.displayName ??
    (user?.displayName?.trim() || user?.name?.trim() || "Player");

  await prisma.playerCard.upsert({
    where: { userId },
    create: {
      userId,
      displayName,
      tier: newTier,
      role: "BAT",
      sportIcon: "BAT_ICON",
      statTec: stats.statTec,
      statPow: stats.statPow,
      statTim: stats.statTim,
      statCon: stats.statCon,
      statPac: stats.statPac,
      statFie: stats.statFie,
      profilePhotoUrl: null,
      backgroundUrl: null,
      backgroundMode: "DEFAULT",
    },
    update: {
      tier: newTier,
      statTec: stats.statTec,
      statPow: stats.statPow,
      statTim: stats.statTim,
      statCon: stats.statCon,
      statPac: stats.statPac,
      statFie: stats.statFie,
    },
  });

  return {
    cardUpdated: true,
    tierChanged,
    previousTier,
    newTier,
  };
}
