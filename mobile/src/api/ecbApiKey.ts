/**
 * Wraps the coach-only Play-Cricket/ECB API key endpoints
 * (app/api/coach/ecb-api-key/**). Real, fully working on the backend
 * (encrypted at rest, masked on read, validated against the live
 * Play-Cricket API) -- unlike most of the Settings page, this feature
 * needed no scoping-down for Phase 2.
 */
import { apiFetch } from "./client";

export interface EcbKeyStatus {
  hasKey: boolean;
  maskedKey: string | null;
  verifiedAt: string | null;
}

export async function getEcbKeyStatus(): Promise<EcbKeyStatus> {
  return apiFetch<EcbKeyStatus>("/api/coach/ecb-api-key");
}

export async function saveEcbKey(apiKey: string): Promise<{ success: true; maskedKey: string }> {
  return apiFetch("/api/coach/ecb-api-key", { method: "POST", body: { apiKey } });
}

export async function removeEcbKey(): Promise<void> {
  await apiFetch("/api/coach/ecb-api-key", { method: "DELETE" });
}

export type EcbValidateResult =
  | { valid: true; verifiedAt: string }
  | { valid: false; reason: "invalid_key" | "unreachable" };

export async function validateEcbKey(): Promise<EcbValidateResult> {
  return apiFetch<EcbValidateResult>("/api/coach/ecb-api-key/validate", { method: "POST" });
}
