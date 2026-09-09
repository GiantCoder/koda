/**
 * Wraps the real coach/parent-facing per-player endpoints behind the
 * players/[playerId] detail screen: GET /api/team/players/[id]/player-card,
 * /analysed-videos, and /analysed-videos/trend. All confirmed real and
 * RBAC-checked (coach must own the player's squad, parent must have a
 * GuardianLink, or it's the player's own record) in both Phase 4 and
 * Phase 6 research.
 */
import { apiFetch } from "./client";
import type { PlayerCardDto } from "./playerCard";

export async function getTeamPlayerCard(playerId: string): Promise<PlayerCardDto> {
  return apiFetch<PlayerCardDto>(`/api/team/players/${playerId}/player-card`);
}

export type VideoCategory = "batting" | "bowling" | "fielding" | "keeping";

export interface AnalysedVideo {
  id: string;
  analysisId: string;
  filename: string | null;
  uploadedAt: string;
  category: VideoCategory;
  gradeLetter: string | null;
  gradeOverall: number | null;
  commentCount: number;
}

export interface AnalysedVideosPage {
  videos: AnalysedVideo[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export async function getPlayerAnalysedVideos(
  playerId: string,
  opts: { page?: number; pageSize?: number; category?: VideoCategory | "all" } = {}
): Promise<AnalysedVideosPage> {
  const params = new URLSearchParams();
  if (opts.page != null) params.set("page", String(opts.page));
  if (opts.pageSize != null) params.set("pageSize", String(opts.pageSize));
  if (opts.category) params.set("category", opts.category);
  const qs = params.toString();
  return apiFetch<AnalysedVideosPage>(
    `/api/team/players/${playerId}/analysed-videos${qs ? `?${qs}` : ""}`
  );
}

export interface PlayerTrendPoint {
  analysisId: string;
  videoId: string;
  uploadedAt: string;
  category: VideoCategory;
  gradeLetter: string | null;
  gradeOverall: number | null;
}

export async function getPlayerTrend(playerId: string, limit = 100): Promise<PlayerTrendPoint[]> {
  const data = await apiFetch<{ points: PlayerTrendPoint[] }>(
    `/api/team/players/${playerId}/analysed-videos/trend?limit=${limit}`
  );
  return data.points;
}
