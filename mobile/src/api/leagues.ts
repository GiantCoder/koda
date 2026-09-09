/**
 * Wraps the real, working Leagues backend (GET/POST /api/leagues,
 * POST /api/leagues/join, GET /api/leagues/[leagueId]/table,
 * GET /api/leagues/global) -- Phase 7 research confirmed this is fully
 * real end-to-end: points really are awarded on every completed analysis
 * (lib/gamification/leagues.ts, run from workers/analysisWorker.ts), ranks
 * really are recalculated on a cron, and web's own Leagues pages call
 * these routes directly with no mocking anywhere.
 */
import { apiFetch } from "./client";
import type { AgeGroup } from "./squads";

export type { AgeGroup };

export type LeagueScope = "CLUB" | "CUSTOM" | "GLOBAL";

export interface LeagueSeason {
  id: string;
  leagueId: string;
  seasonNumber: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface MyLeague {
  id: string;
  name: string;
  scope: LeagueScope;
  currentSeason: LeagueSeason | null;
  userRank: number | null;
  memberCount: number;
}

export async function getMyLeagues(): Promise<MyLeague[]> {
  const data = await apiFetch<{ leagues: MyLeague[] }>("/api/leagues");
  return data.leagues;
}

export interface CreateLeagueInput {
  name: string;
  ageGroup?: AgeGroup;
  seasonLengthDays?: 30 | 60 | 90;
}

/** Any authenticated user can create a custom league -- no role gate on
 * the backend (unlike squads/clubs, which are coach/admin-only). */
export async function createLeague(
  input: CreateLeagueInput
): Promise<{ league: { id: string; name: string; joinCode: string }; season: LeagueSeason }> {
  return apiFetch("/api/leagues", { method: "POST", body: input });
}

export async function joinLeague(
  joinCode: string
): Promise<{ league: { id: string; name: string; scope: LeagueScope }; currentSeason: LeagueSeason }> {
  return apiFetch("/api/leagues/join", { method: "POST", body: { joinCode: joinCode.toUpperCase() } });
}

export interface LeagueEntryUser {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface LeagueEntry {
  id: string;
  leagueSeasonId: string;
  userId: string;
  points: number;
  goldStars: number;
  topScore: number | null;
  analysisCount: number;
  currentRank: number | null;
  previousRank: number | null;
  updatedAt: string;
  user: LeagueEntryUser;
}

export async function getLeagueTable(
  leagueId: string,
  opts: { limit?: number; cursor?: string } = {}
): Promise<{ entries: LeagueEntry[]; nextCursor: string | null; userEntry: LeagueEntry | null }> {
  const params = new URLSearchParams();
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);
  const qs = params.toString();
  return apiFetch(`/api/leagues/${leagueId}/table${qs ? `?${qs}` : ""}`);
}

/**
 * The "Koda Global" age-group leaderboard. Real and browsable, but there's
 * no discoverable way for a user to actually join it -- the system league
 * has a joinCode (so POST /api/leagues/join would technically work), but
 * nothing anywhere in the backend surfaces that code to a user, and
 * completing an analysis only awards points to leagues you're *already* a
 * LeagueMember of (lib/gamification/leagues.ts:updateLeagueEntriesForUser
 * iterates existing memberships only -- it doesn't auto-enroll anyone).
 * So mobile treats this as browse-only, same as web: no "Join" button
 * here, unlike the Leagues list screen's custom/CLUB leagues.
 */
export async function getGlobalLeaderboard(
  ageGroup: AgeGroup,
  opts: { limit?: number; cursor?: string } = {}
): Promise<{ entries: LeagueEntry[]; nextCursor: string | null }> {
  const params = new URLSearchParams({ ageGroup });
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);
  return apiFetch(`/api/leagues/global?${params.toString()}`);
}
