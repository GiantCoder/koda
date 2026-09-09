/**
 * Wraps GET/PUT /api/player-card and POST /api/player-card/upload-image --
 * Phase 2 shipped GET-only, explicitly deferring customization "with the
 * video-analysis features later." Phase 7 research confirmed PUT is real
 * (a Prisma upsert) and upload-image is real (genuine object storage,
 * 8MB cap, signed URLs) -- both fully working, no mocking.
 *
 * NOT wrapped here: POST /api/player-card/generate-background. It's real
 * on the backend (a genuine Anthropic call), but it returns a raw CSS
 * `background` shorthand string (radial/linear gradients, sometimes
 * layered) meant for a web <div>'s style -- React Native has no CSS
 * background-shorthand support at all, and reliably parsing arbitrary
 * AI-generated gradient CSS into `expo-linear-gradient` props isn't a
 * small additive change. Mobile supports DEFAULT and UPLOAD background
 * modes only; AI-generated backgrounds stay a web-only capability until
 * there's a real native rendering path for them.
 */
import { apiFetch, API_BASE_URL, ApiError, refreshAccessToken } from "./client";
import { getAccessToken } from "./tokenStore";

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

export interface UpdatePlayerCardInput {
  displayName: string;
  tier: PlayerCardDto["tier"];
  role: PlayerCardDto["role"];
  sportIcon: PlayerCardDto["sportIcon"];
  statTec: number;
  statPow: number;
  statTim: number;
  statCon: number;
  statPac: number;
  statFie: number;
  profilePhotoUrl?: string | null;
  backgroundUrl?: string | null;
  backgroundMode: "DEFAULT" | "UPLOAD";
}

export async function updatePlayerCard(input: UpdatePlayerCardInput): Promise<PlayerCardDto> {
  return apiFetch<PlayerCardDto>("/api/player-card", { method: "PUT", body: input });
}

export interface UploadPlayerCardImageParams {
  fileUri: string;
  fileName: string;
  mimeType: string;
}

/** Multipart upload -- apiFetch()'s JSON wrapper doesn't apply here, same
 * reasoning as videoUpload.ts, minus the progress callback (a single small
 * image doesn't need one). */
export async function uploadPlayerCardImage(params: UploadPlayerCardImageParams): Promise<string> {
  let accessToken = getAccessToken();
  if (!accessToken) {
    accessToken = await refreshAccessToken();
  }
  if (!accessToken) {
    throw new ApiError("You've been signed out. Please sign in again.", 401);
  }

  const formData = new FormData();
  formData.append("file", {
    uri: params.fileUri,
    name: params.fileName,
    type: params.mimeType,
  } as unknown as Blob);

  const send = (token: string) =>
    fetch(`${API_BASE_URL}/api/player-card/upload-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "x-koda-client": "mobile" },
      body: formData,
    });

  let response = await send(accessToken);
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw new ApiError("Your session expired. Please sign in again.", 401);
    }
    response = await send(refreshed);
  }

  if (!response.ok) {
    let message = `Upload failed with status ${response.status}`;
    try {
      const parsed = (await response.json()) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      // non-JSON error body -- keep the generic message
    }
    throw new ApiError(message, response.status);
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}
