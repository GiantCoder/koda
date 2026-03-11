import { prisma } from "@/prisma/client";
import { recalculateLeagueRanks } from "@/lib/gamification/leagues";

const RANK_CHANGE_THRESHOLD = 3;

/**
 * Recalculate league ranks and send LEAGUE_POSITION_CHANGE for moves of 3+ positions.
 * Schedule: every 30 minutes.
 */
export async function runLeagueRanksCron(): Promise<void> {
  const changes = await recalculateLeagueRanks();

  for (const change of changes) {
    const move = change.oldRank - change.newRank;
    if (Math.abs(move) >= RANK_CHANGE_THRESHOLD) {
      await prisma.notification.create({
        data: {
          userId: change.userId,
          type: "LEAGUE_POSITION_CHANGE",
          title: `Rank update in ${change.leagueName}`,
          message:
            move > 0
              ? `You moved up to #${change.newRank} (from #${change.oldRank}).`
              : `You moved down to #${change.newRank} (from #${change.oldRank}).`,
          actionUrl: "/leagues",
          metadata: {
            leagueId: change.leagueId,
            leagueName: change.leagueName,
            oldRank: change.oldRank,
            newRank: change.newRank,
            direction: move > 0 ? "up" : "down",
          },
        },
      });
    }
  }
}
