/**
 * Wraps GET /api/clubs -- real, but coach/admin-only (COACH gets their own
 * clubs, ADMIN gets all) and read-only here: no create/edit/rating.
 *
 * Two real constraints shape this to a minimal view (see roadmap doc):
 * there's no PLAYER/PARENT-facing "my club" endpoint at all (Clubs is a
 * coach-owned admin resource; a player's club is only ever inferred by
 * free-text name-matching, never exposed to the player themselves), and
 * the endpoint has no real per-club member list -- only aggregate counts
 * (seniors/juniors/playersCoached/sessionsThisMonth). `stats.averageRating`
 * is a fabricated hash of each player's id (same pattern already skipped
 * on the Squads screen in Phase 6) -- deliberately not modeled here.
 */
import { apiFetch } from "./client";

export interface ClubStats {
  seniors: number;
  juniors: number;
  playersCoached: number;
  sessionsThisMonth: number;
}

export interface ClubSummary {
  id: string;
  name: string;
  address: string;
  postcode: string;
  stats: ClubStats;
}

export async function getMyClubs(): Promise<ClubSummary[]> {
  const data = await apiFetch<{ clubs: (ClubSummary & { stats: ClubStats & { averageRating: number } })[] }>(
    "/api/clubs"
  );
  return data.clubs.map(({ stats, ...club }) => ({
    ...club,
    stats: {
      seniors: stats.seniors,
      juniors: stats.juniors,
      playersCoached: stats.playersCoached,
      sessionsThisMonth: stats.sessionsThisMonth,
    },
  }));
}
