/**
 * One-off script to run recalculateLeagueRanks().
 * Use after manual DB changes or to verify ranks without waiting for the cron.
 *
 * Run: npx tsx scripts/recalculate-league-ranks.ts
 * Requires: DATABASE_URL in .env or .env.local
 */
import { recalculateLeagueRanks } from "../lib/gamification/leagues";

async function main() {
  console.log("Running recalculateLeagueRanks()...");
  const changes = await recalculateLeagueRanks();
  console.log(`Done. Rank changes: ${changes.length}`);
  if (changes.length > 0) {
    changes.forEach((c) =>
      console.log(`  ${c.leagueName} | user ${c.userId.slice(0, 8)}... | #${c.oldRank} → #${c.newRank}`)
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
