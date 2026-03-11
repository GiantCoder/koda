import type { Analysis } from "@prisma/client";
import { awardAnalysisPoints } from "@/lib/gamification/points";
import { checkAndAwardBadges } from "@/lib/gamification/badges";
import { updateLeagueEntriesForUser } from "@/lib/gamification/leagues";
import { updatePlayerCardFromAnalyses } from "@/lib/gamification/card-update";
import { sendGamificationNotifications } from "@/lib/gamification/notifications";

/**
 * Run the full gamification pipeline for a completed analysis.
 * Awards points, badges, league updates, card update, and notifications.
 * Safe to call from worker or API route; errors are logged but not thrown.
 */
export async function runGamificationPipeline(
  userId: string,
  analysis: Analysis
): Promise<void> {
  try {
    const transactions = await awardAnalysisPoints(userId, {
      id: analysis.id,
      gradeOverall: analysis.gradeOverall,
    });
    const totalAwarded = transactions.reduce((sum, t) => sum + t.points, 0);
    const newBadges = await checkAndAwardBadges(userId, analysis);
    await updateLeagueEntriesForUser(userId, totalAwarded, {
      gradeOverall: analysis.gradeOverall,
    });
    const cardResult = await updatePlayerCardFromAnalyses(userId);
    const tierChange =
      cardResult?.tierChanged && cardResult.previousTier != null
        ? { from: cardResult.previousTier, to: cardResult.newTier }
        : undefined;
    await sendGamificationNotifications(userId, {
      pointsAwarded: totalAwarded,
      newBadges,
      tierChange,
      cardUpdated: cardResult?.cardUpdated ? { newTier: cardResult.newTier } : undefined,
    });
  } catch (err) {
    console.error("[Gamification] Pipeline error (non-fatal):", err);
  }
}
