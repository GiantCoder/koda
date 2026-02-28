/**
 * Simple auth mock for MVP. Replace with real auth (e.g. NextAuth, JWT) later.
 * Checks localStorage for a mock token; no server-side validation.
 */
export const AUTH_STORAGE_KEY = "koda_auth_token";

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
}
