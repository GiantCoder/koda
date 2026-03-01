/**
 * Simple auth mock for MVP. Replace with real auth (e.g. NextAuth, JWT) later.
 * Checks localStorage for a mock token; no server-side validation.
 */
export const AUTH_STORAGE_KEY = "koda_auth_token";
export const ONBOARDING_COMPLETE_KEY = "koda_onboarding_complete";
export const PROFILE_AVATAR_URL_KEY = "koda_profile_avatar_url";
export const PROFILE_AVATAR_UPDATED_EVENT = "koda:avatar-updated";

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
  localStorage.removeItem(PROFILE_AVATAR_URL_KEY);
  window.dispatchEvent(new Event(PROFILE_AVATAR_UPDATED_EVENT));
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

export function getProfileAvatarUrl(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PROFILE_AVATAR_URL_KEY);
}

export function setProfileAvatarUrl(url: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_AVATAR_URL_KEY, url);
  window.dispatchEvent(new Event(PROFILE_AVATAR_UPDATED_EVENT));
}
