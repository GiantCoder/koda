/**
 * Wraps GET /api/dashboard/summary. This is a real, working endpoint, but
 * (per the Phase 2 research) it's an intentional MVP stub on the backend:
 * user info is real, but stats.* are hardcoded zeros because the schema
 * doesn't yet track Video/Analysis/Session. Unlike the web dashboard --
 * which never calls this endpoint at all and shows entirely fake session/
 * squad/activity data instead -- mobile calls it for real and shows honest
 * zero-state messaging rather than inventing numbers.
 */
import { apiFetch } from "./client";

export interface DashboardSummary {
  user: {
    id: string;
    displayName: string;
    role: "PLAYER" | "PARENT" | "COACH" | "ADMIN";
    memberSince: string;
  };
  stats: {
    totalAnalyses: number;
    totalVideos: number;
    upcomingSessions: number;
    latestGrade: string | null;
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>("/api/dashboard/summary");
}
