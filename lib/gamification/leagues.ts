/**
 * Stub for league entry updates after analysis. Agent 3 implements the real version.
 * Called from the analysis worker after points and badges; must not throw.
 */
export async function updateLeagueEntriesForUser(
  _userId: string,
  _pointsToAdd: number,
  _analysis: { gradeOverall: number | null }
): Promise<void> {
  // Stub: log and return. Agent 3 will implement:
  // - find LeagueMembers for user → active LeagueSeasons
  // - upsert LeagueEntry: increment points, goldStars if gradeOverall >= 90, analysisCount, topScore
  if (process.env.NODE_ENV !== "test") {
    console.log("[Gamification] updateLeagueEntriesForUser (stub) called");
  }
}
