/**
 * Wraps the real, honest progress endpoints: GET /api/progress/[userId],
 * /trend, and /shots. Deliberately NOT wrapping the mocked web page's own
 * data shape or the plain GET /api/progress (self) route -- both bundle in
 * hardcoded achievements/coach-comments alongside the real stats. Going
 * straight to the per-userId routes keeps mobile's Progress screen honest:
 * every number it shows traces back to a real `Analysis` row. Achievements
 * (GET /api/progress/[userId]/achievements) are an explicit backend stub
 * with no Achievement/UserAchievement model in the schema at all -- not
 * wrapped here, see roadmap doc.
 */
import { apiFetch } from "./client";

export interface ProgressSummary {
  userId: string;
  totalSessions: number;
  avgGrade: number | null;
  gradeLetter: string | null;
  bestShot: string | null;
  recentSessions: Array<{
    id: string;
    grade: number | null;
    gradeLetter: string | null;
    shotType: string | null;
    completedAt: string | null;
  }>;
}

export async function getProgressSummary(userId: string): Promise<ProgressSummary> {
  return apiFetch<ProgressSummary>(`/api/progress/${userId}`);
}

export interface ProgressTrendPoint {
  date: string;
  grade: number;
  analysisId: string;
}

export async function getProgressTrend(userId: string): Promise<ProgressTrendPoint[]> {
  const data = await apiFetch<{ trend: ProgressTrendPoint[] }>(`/api/progress/${userId}/trend`);
  return data.trend;
}

export interface ShotDistributionEntry {
  shotType: string;
  count: number;
  percentage?: number;
}

export async function getShotDistribution(userId: string): Promise<ShotDistributionEntry[]> {
  const data = await apiFetch<{ shots: ShotDistributionEntry[] }>(`/api/progress/${userId}/shots`);
  return data.shots;
}
