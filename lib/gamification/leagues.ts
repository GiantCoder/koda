import { prisma } from "@/prisma/client";
import { awardBadgePoints } from "./badges";

const GOLD_STAR_THRESHOLD = 90;
const DEFAULT_SEASON_DAYS = 30;
const LEAGUE_CHAMPION_BADGE_KEY = "LEAGUE_CHAMPION";

export interface RankChangeResult {
  userId: string;
  leagueId: string;
  leagueName: string;
  oldRank: number;
  newRank: number;
}

/**
 * Called after an analysis completes. Adds points to all league entries for this user.
 * Does NOT recalculate ranks (cron's job).
 */
export async function updateLeagueEntriesForUser(
  userId: string,
  pointsToAdd: number,
  analysis: { gradeOverall: number | null }
): Promise<void> {
  const grade = analysis.gradeOverall ?? 0;
  const goldStar = grade >= GOLD_STAR_THRESHOLD ? 1 : 0;

  const memberships = await prisma.leagueMember.findMany({
    where: { userId },
    select: { leagueId: true },
  });

  for (const { leagueId } of memberships) {
    const season = await prisma.leagueSeason.findFirst({
      where: { leagueId, isActive: true },
      orderBy: { seasonNumber: "desc" },
    });
    if (!season) continue;

    const existing = await prisma.leagueEntry.findUnique({
      where: {
        leagueSeasonId_userId: { leagueSeasonId: season.id, userId },
      },
    });

    const newTopScore =
      grade > 0 && (existing?.topScore == null || grade > existing.topScore)
        ? grade
        : existing?.topScore ?? null;

    await prisma.leagueEntry.upsert({
      where: {
        leagueSeasonId_userId: { leagueSeasonId: season.id, userId },
      },
      create: {
        leagueSeasonId: season.id,
        userId,
        points: pointsToAdd,
        goldStars: goldStar,
        analysisCount: 1,
        topScore: newTopScore,
        updatedAt: new Date(),
      },
      update: {
        points: { increment: pointsToAdd },
        goldStars: { increment: goldStar },
        analysisCount: { increment: 1 },
        topScore: newTopScore,
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Recalculate currentRank and previousRank for all entries in all active seasons.
 * Returns entries where rank changed.
 */
export async function recalculateLeagueRanks(): Promise<RankChangeResult[]> {
  const activeSeasons = await prisma.leagueSeason.findMany({
    where: { isActive: true },
    include: { league: { select: { name: true } } },
  });

  const results: RankChangeResult[] = [];

  for (const season of activeSeasons) {
    const entries = await prisma.leagueEntry.findMany({
      where: { leagueSeasonId: season.id },
      orderBy: [{ points: "desc" }, { goldStars: "desc" }],
    });

    let rank = 1;
    for (const entry of entries) {
      const oldRank = entry.currentRank;
      const newRank = rank;
      if (oldRank !== newRank) {
        results.push({
          userId: entry.userId,
          leagueId: season.leagueId,
          leagueName: season.league.name,
          oldRank: oldRank ?? 0,
          newRank,
        });
      }
      await prisma.leagueEntry.update({
        where: { id: entry.id },
        data: { previousRank: entry.currentRank, currentRank: newRank, updatedAt: new Date() },
      });
      rank++;
    }
  }

  return results;
}

/**
 * Complete all seasons that have passed their endsAt: mark inactive, recalc final ranks,
 * award LEAGUE_CHAMPION to rank 1, reset currentSeasonPts for members, create next season,
 * send SEASON_COMPLETE notifications.
 */
export async function completeExpiredSeasons(): Promise<void> {
  const now = new Date();
  const expired = await prisma.leagueSeason.findMany({
    where: { isActive: true, endsAt: { lt: now } },
    include: {
      league: true,
      entries: { orderBy: [{ points: "desc" }, { goldStars: "desc" }] },
    },
  });

  for (const season of expired) {
    await prisma.leagueSeason.update({
      where: { id: season.id },
      data: { isActive: false, completedAt: now },
    });

    let rank = 1;
    let championUserId: string | null = null;
    for (const entry of season.entries) {
      await prisma.leagueEntry.update({
        where: { id: entry.id },
        data: { previousRank: entry.currentRank, currentRank: rank, updatedAt: now },
      });
      if (rank === 1) championUserId = entry.userId;
      rank++;
    }

    if (championUserId && season.league.scope === "CLUB") {
      const badgeDef = await prisma.badgeDefinition.findUnique({
        where: { key: LEAGUE_CHAMPION_BADGE_KEY },
      });
      if (badgeDef) {
        const existing = await prisma.userBadge.findUnique({
          where: {
            userId_badgeDefinitionId: { userId: championUserId, badgeDefinitionId: badgeDef.id },
          },
        });
        if (!existing) {
          const userBadge = await prisma.userBadge.create({
            data: {
              userId: championUserId,
              badgeDefinitionId: badgeDef.id,
              referenceId: season.id,
            },
            include: { badgeDefinition: true },
          });
          await awardBadgePoints(championUserId, badgeDef, userBadge.id);
        }
      }
    }

    const memberIds = await prisma.leagueMember.findMany({
      where: { leagueId: season.leagueId },
      select: { userId: true },
    });
    for (const { userId } of memberIds) {
      await prisma.userPoints.updateMany({
        where: { userId },
        data: { currentSeasonPts: 0 },
      });
    }

    const entriesWithRank = await prisma.leagueEntry.findMany({
      where: { leagueSeasonId: season.id },
      select: { userId: true, currentRank: true },
    });
    const rankByUser = new Map(entriesWithRank.map((e) => [e.userId, e.currentRank]));

    for (const { userId } of memberIds) {
      const finalRank = rankByUser.get(userId) ?? 0;
      await prisma.notification.create({
        data: {
          userId,
          type: "SEASON_COMPLETE",
          title: `${season.league.name} season finished`,
          message: `Season has ended. You finished rank #${finalRank}.`,
          actionUrl: "/leagues",
          metadata: { leagueId: season.leagueId, leagueName: season.league.name, finalRank },
        },
      });
    }

    const nextNumber = season.seasonNumber + 1;
    const nextStarts = new Date(now);
    const nextEnds = new Date(nextStarts);
    nextEnds.setDate(nextEnds.getDate() + DEFAULT_SEASON_DAYS);

    const newSeason = await prisma.leagueSeason.create({
      data: {
        leagueId: season.leagueId,
        seasonNumber: nextNumber,
        startsAt: nextStarts,
        endsAt: nextEnds,
        isActive: true,
      },
    });

    for (const { userId } of memberIds) {
      await prisma.leagueEntry.upsert({
        where: {
          leagueSeasonId_userId: { leagueSeasonId: newSeason.id, userId },
        },
        create: {
          leagueSeasonId: newSeason.id,
          userId,
          points: 0,
          goldStars: 0,
          analysisCount: 0,
          updatedAt: new Date(),
        },
        update: {},
      });
    }
  }
}

/** Generate a unique 6-character alphanumeric join code. */
export async function generateJoinCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const existing = await prisma.league.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate unique join code");
}
