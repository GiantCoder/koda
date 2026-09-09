/**
 * Wraps POST /api/shadow-batting/upload -- real, and deliberately reuses
 * the exact same Video/Analysis/BullMQ pipeline as the main upload flow
 * (src/api/videoUpload.ts), just with a required `shotType` (the player
 * declares what shot they're practicing) and `duration`. Once queued, it's
 * indistinguishable from a normal upload -- the existing
 * analysis/[videoId]/processing and analysis/[videoId] screens handle the
 * rest with zero changes.
 *
 * SHOT_TYPES mirrors src/lib/cricket/shot-types.ts on the web side (kept
 * as a plain local copy rather than a shared package, consistent with how
 * this codebase's mobile/web split works elsewhere) -- UNKNOWN omitted,
 * same as web's own player-facing picker.
 */
import { getAccessToken } from "./tokenStore";
import { refreshAccessToken, API_BASE_URL, ApiError } from "./client";

export const SHOT_TYPES: { value: string; label: string }[] = [
  { value: "COVER_DRIVE", label: "Cover Drive" },
  { value: "OFF_DRIVE", label: "Off Drive" },
  { value: "STRAIGHT_DRIVE", label: "Straight Drive" },
  { value: "ON_DRIVE", label: "On Drive" },
  { value: "SWEEP", label: "Sweep" },
  { value: "REVERSE_SWEEP", label: "Reverse Sweep" },
  { value: "PULL", label: "Pull Shot" },
  { value: "HOOK", label: "Hook Shot" },
  { value: "CUT", label: "Cut Shot" },
  { value: "GLANCE", label: "Glance" },
  { value: "DEFENSIVE", label: "Defensive" },
  { value: "LATE_CUT", label: "Late Cut" },
  { value: "FLICK", label: "Flick" },
  { value: "SCOOP", label: "Scoop" },
  { value: "FORWARD_DEFENCE", label: "Forward Defence" },
  { value: "BACK_FOOT_DEFENCE", label: "Back Foot Defence" },
  { value: "LEG_GLANCE", label: "Leg Glance" },
  { value: "SQUARE_CUT", label: "Square Cut" },
  { value: "UPPER_CUT", label: "Upper Cut" },
  { value: "LOFTED_DRIVE", label: "Lofted Drive" },
  { value: "PADDLE_SWEEP", label: "Paddle Sweep" },
  { value: "RAMP", label: "Ramp" },
  { value: "CHECK_DRIVE", label: "Check Drive" },
  { value: "LEAVE", label: "Leave" },
];

export const DURATION_OPTIONS = [5, 10, 15, 30, 45, 60];
export const PREP_TIME_OPTIONS = [3, 5, 10];

export interface ShadowBattingUploadResult {
  id: string;
  analysisId: string;
  status: string;
  async: boolean;
  warning: string | null;
}

export interface UploadShadowBattingClipParams {
  fileUri: string;
  fileName: string;
  mimeType: string;
  shotType: string;
  durationSeconds: number;
}

function sendUpload(
  params: UploadShadowBattingClipParams,
  accessToken: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/shadow-batting/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-koda-client", "mobile");
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error("Upload failed -- check your connection and try again."));

    const formData = new FormData();
    formData.append("file", {
      uri: params.fileUri,
      name: params.fileName,
      type: params.mimeType,
    } as unknown as Blob);
    formData.append("shotType", params.shotType);
    formData.append("duration", String(params.durationSeconds));
    xhr.send(formData);
  });
}

export async function uploadShadowBattingClip(
  params: UploadShadowBattingClipParams
): Promise<ShadowBattingUploadResult> {
  let accessToken = getAccessToken();
  if (!accessToken) {
    accessToken = await refreshAccessToken();
  }
  if (!accessToken) {
    throw new ApiError("You've been signed out. Please sign in again.", 401);
  }

  let result = await sendUpload(params, accessToken);

  if (result.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw new ApiError("Your session expired. Please sign in again.", 401);
    }
    result = await sendUpload(params, refreshed);
  }

  if (result.status < 200 || result.status >= 300) {
    let message = `Upload failed with status ${result.status}`;
    try {
      const parsed = JSON.parse(result.body) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      // non-JSON error body -- keep the generic message
    }
    throw new ApiError(message, result.status);
  }

  return JSON.parse(result.body) as ShadowBattingUploadResult;
}
