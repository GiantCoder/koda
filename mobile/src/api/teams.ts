import { apiFetch } from "./client";

export interface CoachTeam {
  id: string;
  name: string;
  clubName: string;
  squadHint?: string;
  bannerFileName?: string;
  bannerImageUrl?: string;
  persisted?: boolean;
}

export async function getTeams(): Promise<CoachTeam[]> {
  const data = await apiFetch<{ teams: CoachTeam[] }>("/api/play-cricket/teams");
  return data.teams;
}

export interface CreateTeamInput {
  name: string;
  clubName: string;
  squadHint?: string;
  bannerFileName?: string;
  bannerImageUrl?: string;
}

export async function createTeam(input: CreateTeamInput): Promise<CoachTeam> {
  const data = await apiFetch<{ team: CoachTeam }>("/api/play-cricket/teams", {
    method: "POST",
    body: input,
  });
  return data.team;
}

export interface UpdateTeamInput {
  name?: string;
  clubName?: string;
  squadHint?: string | null;
  bannerFileName?: string | null;
  bannerImageUrl?: string | null;
}

export async function updateTeam(id: string, input: UpdateTeamInput): Promise<CoachTeam> {
  const data = await apiFetch<{ team: CoachTeam }>(`/api/play-cricket/teams/${id}`, {
    method: "PUT",
    body: input,
  });
  return data.team;
}

export async function deleteTeam(id: string): Promise<void> {
  await apiFetch(`/api/play-cricket/teams?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}
