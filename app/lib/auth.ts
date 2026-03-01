/**
 * Simple auth mock for MVP. Replace with real auth (e.g. NextAuth, JWT) later.
 * Checks localStorage for a mock token; no server-side validation.
 */
export const AUTH_STORAGE_KEY = "koda_auth_token";
export const ONBOARDING_COMPLETE_KEY = "koda_onboarding_complete";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";
}

export function setOnboardingComplete(value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_COMPLETE_KEY, value ? "true" : "false");
}

export function getPostAuthRoute(): string {
  return isOnboardingComplete() ? "/dashboard" : "/onboarding/role";
}
