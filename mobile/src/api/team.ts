/**
 * Wraps the real team-roster management backend (PUT/DELETE
 * /api/team/players/[id], POST /api/team/players) plus this phase's new
 * GET /api/team/coach addition. GET /api/team/players itself is already
 * wrapped as getAssignablePlayers() in src/api/videos.ts (Phase 3) --
 * reused here rather than duplicated.
 */
import { apiFetch } from "./client";
import type { AgeGroup } from "./squads";

export interface TeamPlayerUpdate {
  displayName?: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  battingStyle?: string | null;
  bowlingStyle?: string | null;
  clubOrSchool?: string | null;
  primaryPosition?: string | null;
  profileVisibility?: "COACHES_PARENTS" | "COACHES_ONLY" | "PUBLIC" | null;
  ageGroup?: AgeGroup | null;
  squadId?: string;
}

export async function updateTeamPlayer(
  id: string,
  updates: TeamPlayerUpdate
): Promise<{ player: { id: string; displayName: string; email: string } }> {
  return apiFetch(`/api/team/players/${id}`, { method: "PUT", body: updates });
}

/** COACH: removes from all your squads. PARENT: removes the guardian link.
 * Neither deletes the player's account. */
export async function removeTeamPlayer(id: string): Promise<{ message: string }> {
  return apiFetch(`/api/team/players/${id}`, { method: "DELETE" });
}

export interface CreateTeamPlayerInput {
  displayName: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  squadId?: string;
}

/** Coach/admin only. Creates a brand-new player account (a fallback
 * @koda.local email is generated server-side if none is given) and,
 * if squadId is passed, adds them to that squad in the same call. */
export async function createTeamPlayer(
  input: CreateTeamPlayerInput
): Promise<{ player: { id: string; displayName: string; email: string } }> {
  return apiFetch("/api/team/players", { method: "POST", body: input });
}

export interface CoachContact {
  id: string;
  displayName: string;
}

export async function getMyCoaches(): Promise<CoachContact[]> {
  const data = await apiFetch<{ coaches: CoachContact[] }>("/api/team/coach");
  return data.coaches;
}
