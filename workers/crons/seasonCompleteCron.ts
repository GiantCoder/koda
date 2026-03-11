import { completeExpiredSeasons } from "@/lib/gamification/leagues";

/**
 * Complete all seasons that have passed their endsAt.
 * Schedule: daily at 00:05.
 */
export async function runSeasonCompleteCron(): Promise<void> {
  await completeExpiredSeasons();
}
