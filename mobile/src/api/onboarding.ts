/**
 * Wraps app/api/onboarding/** (consent, privacy, profile). These are real,
 * working endpoints -- unlike the web app's /onboarding/* pages, which are
 * currently client-only mocks that don't call any of this (see the Phase 1
 * discussion). Mobile calls them for real.
 */
import { z } from "zod";
import { apiFetch } from "./client";

export const consentRequestSchema = z.object({
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianEmail: z.string().email(),
  guardianRelationship: z.enum(["mother", "father", "guardian", "other"]).default("guardian"),
});
export type ConsentRequestInput = z.infer<typeof consentRequestSchema>;

export interface ConsentStatusResponse {
  consentStatus: "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED";
  requiresConsent: boolean;
  guardianEmail?: string;
  tokenExpiresAt?: string;
}

export async function requestGuardianConsent(input: ConsentRequestInput): Promise<void> {
  const parsed = consentRequestSchema.parse(input);
  await apiFetch("/api/onboarding/consent/request", { method: "POST", body: parsed });
}

export async function getConsentStatus(): Promise<ConsentStatusResponse> {
  return apiFetch<ConsentStatusResponse>("/api/onboarding/consent/status");
}

export async function resendGuardianConsent(): Promise<void> {
  await apiFetch("/api/onboarding/consent/resend", { method: "POST" });
}

export const privacyUpdateSchema = z.object({
  performanceAnalytics: z.boolean().optional(),
  marketingCommunications: z.boolean().optional(),
  coachParentComms: z.boolean().optional(),
  profileVisibility: z.enum(["COACHES_PARENTS", "COACHES_ONLY", "PUBLIC"]).optional(),
});
export type PrivacyUpdateInput = z.infer<typeof privacyUpdateSchema>;

export interface PrivacyPreferences {
  performanceAnalytics: boolean;
  marketingCommunications: boolean;
  coachParentComms: boolean;
  profileVisibility: "COACHES_PARENTS" | "COACHES_ONLY" | "PUBLIC";
}

// GET added alongside the mobile Phase 2 Settings screen -- unlike the web
// app's privacy toggles (local state, never read back), Settings needs to
// show what's actually saved rather than resetting to defaults every time
// it's opened. See app/api/onboarding/privacy/route.ts for the backend side.
export async function getPrivacyPreferences(): Promise<PrivacyPreferences> {
  return apiFetch<PrivacyPreferences>("/api/onboarding/privacy");
}

export async function updatePrivacyPreferences(input: PrivacyUpdateInput): Promise<void> {
  const parsed = privacyUpdateSchema.parse(input);
  await apiFetch("/api/onboarding/privacy", { method: "PUT", body: parsed });
}

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).optional(),
  clubOrSchool: z.string().optional(),
  primaryPosition: z.string().optional(),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export async function updateProfile(input: ProfileUpdateInput): Promise<void> {
  const parsed = profileUpdateSchema.parse(input);
  await apiFetch("/api/onboarding/profile", { method: "PUT", body: parsed });
}
