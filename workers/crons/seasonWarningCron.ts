import { prisma } from "@/prisma/client";

/**
 * Find active seasons ending within 48h and send SEASON_ENDING notification to all members with current rank.
 * Schedule: daily at 08:00.
 */
export async function runSeasonWarningCron(): Promise<void> {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const seasons = await prisma.leagueSeason.findMany({
    where: {
      isActive: true,
      endsAt: { gte: now, lte: in48h },
    },
    include: { league: { select: { name: true } } },
  });

  for (const season of seasons) {
    const entries = await prisma.leagueEntry.findMany({
      where: { leagueSeasonId: season.id },
      select: { userId: true, currentRank: true },
    });
    const rankByUser = new Map(entries.map((e) => [e.userId, e.currentRank ?? 0]));

    const members = await prisma.leagueMember.findMany({
      where: { leagueId: season.leagueId },
      select: { userId: true },
    });

    for (const { userId } of members) {
      const rank = rankByUser.get(userId) ?? 0;
      await prisma.notification.create({
        data: {
          userId,
          type: "SEASON_ENDING",
          title: `${season.league.name} season ending soon`,
          message: `The season ends in 48 hours. You're currently rank #${rank}.`,
          actionUrl: "/leagues",
          metadata: { leagueId: season.leagueId, leagueName: season.league.name, currentRank: rank },
        },
      });
    }
  }
}
