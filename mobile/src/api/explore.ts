/**
 * Wraps the real Explore backend (GET /api/explore/clips,
 * GET /api/explore/clips/[id]). Phase 7 research found this genuinely
 * unauthenticated on the server -- neither route calls getAuthUser -- so
 * every completed analysis's metadata (filename, grade, shot type,
 * uploader's real name, and on the detail route, the full coaching-tips
 * text) is publicly readable with no login and no consent. Per the user's
 * explicit decision, mobile matches web's current behavior rather than
 * fixing or hiding this -- see the roadmap doc for the full writeup and
 * the flag raised to the team.
 *
 * Two real, separate constraints this screen has to work around honestly:
 * `thumbnail` URLs point at `/api/videos/[id]/thumbnail`, which doesn't
 * exist anywhere in this codebase (a pre-existing dead reference, not
 * mobile-specific) -- so this UI never tries to load a thumbnail image.
 * And `/api/videos/[id]/stream` (what `videoUrl` points to) only lets the
 * video's own owner stream it, in production -- so playback here only
 * works for clips you uploaded yourself; every other clip is metadata-only.
 * `views`/`likes` are hardcoded literals in the real backend response
 * (not mobile mock data) -- shown as-is since that's what web shows too.
 */
import { apiFetch } from "./client";

export interface ExploreClipSummary {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number | null;
  grade: string;
  gradeScore: number;
  shotType: string;
  views: number;
  likes: number;
  uploadedBy: string;
  uploadedById: string;
  uploadedAt: string;
}

export async function getExploreClips(
  opts: { search?: string; shotType?: string; sort?: "recent" | "top_rated" | "most_viewed"; limit?: number; offset?: number } = {}
): Promise<{ clips: ExploreClipSummary[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (opts.search) params.set("search", opts.search);
  if (opts.shotType) params.set("shotType", opts.shotType);
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return apiFetch(`/api/explore/clips${qs ? `?${qs}` : ""}`);
}

export interface ExploreClipDetail {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnail: string;
  duration: number | null;
  grade: string;
  gradeScore: number;
  shotType: string;
  shotConfidence: number;
  views: number;
  likes: number;
  uploadedBy: string;
  uploadedById: string;
  uploadedByAvatar: string | null;
  uploadedAt: string;
  analysis: {
    scores: { stanceBalance: number; batPathFollowThrough: number };
    coachingTips: unknown[];
    technicalFeedback: unknown;
  };
  relatedClips: { id: string; title: string; thumbnail: string; duration: number | null; shotType: string; uploadedBy: string }[];
}

export async function getExploreClip(id: string): Promise<ExploreClipDetail> {
  return apiFetch(`/api/explore/clips/${id}`);
}
