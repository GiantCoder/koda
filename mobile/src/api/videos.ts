/**
 * Wraps the video-listing endpoints used by the upload flow:
 * GET /api/team/players (who a coach/parent can assign an upload to) and
 * GET /api/videos (recent uploads + their processing status). Both are
 * real, working, role-aware endpoints -- no backend changes needed.
 */
import { apiFetch } from "./client";
import type { UploadProcessingState } from "@/lib/analysisStages";

export interface AssignablePlayer {
  id: string;
  displayName: string;
}

/**
 * COACH/ADMIN get their squad's players, PARENT gets linked children,
 * PLAYER gets just themselves (so mobile skips calling this for players --
 * there's never a real choice to make).
 */
export async function getAssignablePlayers(): Promise<AssignablePlayer[]> {
  const data = await apiFetch<{ players: AssignablePlayer[] }>("/api/team/players");
  return data.players;
}

export interface RecentUpload {
  id: string;
  filename: string;
  uploadedAt: string;
  processingState: UploadProcessingState;
  analysis: {
    status: string;
    gradeLetter: string | null;
    gradeOverall: number | null;
    activityType: string | null;
  } | null;
}

export async function getRecentUploads(limit = 8): Promise<RecentUpload[]> {
  const data = await apiFetch<{ videos: RecentUpload[] }>(`/api/videos?limit=${limit}`);
  return data.videos;
}
