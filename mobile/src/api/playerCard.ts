/**
 * Wraps GET /api/player-card -- a real, working endpoint. Read-only here;
 * the matching PUT (card customization: background, photo) belongs with
 * the video-analysis features later, not basic profile viewing.
 */
import { apiFetch } from "./client";

export interface PlayerCardDto {
  id: string | null;
  userId: string;
  displayName: string;
  tier: "BRONZE" | "SILVER" | "GOLD" | "ELITE";
  role: "BAT" | "BWL" | "ALL" | "WKT";
  sportIcon: "BAT_ICON" | "BALL_ICON" | "GLOVES_ICON";
  statTec: number;
  statPow: number;
  statTim: number;
  statCon: number;
  statPac: number;
  statFie: number;
  profilePhotoUrl: string | null;
  backgroundUrl: string | null;
  backgroundMode: "DEFAULT" | "UPLOAD" | "AI";
  overall: number;
}

export async function getPlayerCard(): Promise<PlayerCardDto> {
  return apiFetch<PlayerCardDto>("/api/player-card");
}
