/**
 * Wraps the real, working Gamification backend (GET /api/gamification/
 * summary, /badges, /points/history) -- Phase 7 research found this is a
 * fully real, tested, Prisma-backed system (points and badges are
 * genuinely awarded on every completed analysis, same pipeline as
 * Leagues) with a striking gap: *no page anywhere in the web app calls
 * any of these three endpoints*. Points and badges have been silently
 * accumulating for every user with nothing to show them. Mobile is the
 * first client to actually surface this.
 */
import { apiFetch } from "./client";

export type BadgeRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type PointEarnSource = "UPLOADS_ONLY" | "SHADOW_BATTING_ONLY" | "BOTH";

export interface BadgeDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  iconKey: string;
  pointsValue: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface GamificationSummary {
  totalPoints: number;
  currentSeasonPts: number;
  goldStarCount: number;
  practiceStreakDays: number;
  recentBadges: { definition: BadgeDefinition; earnedAt: string }[];
  leagueSummary: { leagueName: string; rank: number; totalMembers: number } | null;
  pointEarnSource: PointEarnSource;
}

export async function getGamificationSummary(): Promise<GamificationSummary> {
  return apiFetch<GamificationSummary>("/api/gamification/summary");
}

export interface BadgeCatalogueEntry {
  definition: BadgeDefinition;
  earned: boolean;
  earnedAt: string | null;
}

export async function getBadges(): Promise<BadgeCatalogueEntry[]> {
  const data = await apiFetch<{ badges: BadgeCatalogueEntry[] }>("/api/gamification/badges");
  return data.badges;
}

export interface PointTransaction {
  id: string;
  userId: string;
  points: number;
  reason: string;
  referenceId: string | null;
  metadata: unknown;
  createdAt: string;
}

export async function getPointsHistory(
  opts: { limit?: number; cursor?: string } = {}
): Promise<{ transactions: PointTransaction[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);
  const qs = params.toString();
  return apiFetch(`/api/gamification/points/history${qs ? `?${qs}` : ""}`);
}
