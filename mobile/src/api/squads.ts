/**
 * Wraps the real, fully-working squad CRUD backend (GET/POST /api/squads,
 * PUT/DELETE /api/squads/[id], POST /api/squads/[id]/members,
 * DELETE /api/squads/[id]/members/[userId]) -- Phase 6 research confirmed
 * this is genuine, coach/admin-gated, ownership-checked CRUD, not a mock.
 *
 * Deliberately NOT modeled here: the `rating` field GET /api/squads
 * includes per member. It's fabricated (a hash of the user's id, unrelated
 * to any real grade/performance data) -- see roadmap doc. Skipped entirely
 * per the user's decision rather than porting fake data.
 */
import { apiFetch } from "./client";

export type AgeGroup = "UNDER_10" | "UNDER_12" | "UNDER_14" | "UNDER_16" | "UNDER_18" | "SENIOR";

export interface SquadMember {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  ageGroup: AgeGroup | null;
  role: string;
  joinedAt: string;
  isMinor: boolean;
}

export interface Squad {
  id: string;
  name: string;
  ageGroup: AgeGroup | null;
  clubName: string | null;
  isActive: boolean;
  bannerFileName?: string | null;
  bannerImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  members: SquadMember[];
}

export async function getSquads(): Promise<Squad[]> {
  const data = await apiFetch<{ squads: Squad[] }>("/api/squads");
  return data.squads;
}

export interface CreateSquadInput {
  name: string;
  ageGroup?: AgeGroup;
  clubName?: string;
  bannerFileName?: string;
  bannerImageUrl?: string;
}

export async function createSquad(input: CreateSquadInput): Promise<Squad> {
  return apiFetch<Squad>("/api/squads", { method: "POST", body: input });
}

export interface UpdateSquadInput {
  name?: string;
  ageGroup?: AgeGroup | null;
  clubName?: string | null;
  isActive?: boolean;
  bannerFileName?: string | null;
  bannerImageUrl?: string | null;
}

export async function updateSquad(id: string, input: UpdateSquadInput): Promise<Squad> {
  return apiFetch<Squad>(`/api/squads/${id}`, { method: "PUT", body: input });
}

export async function deleteSquad(id: string): Promise<void> {
  await apiFetch(`/api/squads/${id}`, { method: "DELETE" });
}

export async function addSquadMember(squadId: string, userId: string): Promise<SquadMember> {
  return apiFetch<SquadMember>(`/api/squads/${squadId}/members`, {
    method: "POST",
    body: { userId },
  });
}

export async function removeSquadMember(squadId: string, userId: string): Promise<void> {
  await apiFetch(`/api/squads/${squadId}/members/${userId}`, { method: "DELETE" });
}
