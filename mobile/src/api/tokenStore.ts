/**
 * Single source of truth for auth tokens on the mobile client.
 *
 * Mirrors the web app's split (app/api/auth/*): a short-lived access token
 * that's never persisted to disk, plus a longer-lived refresh token. Web
 * keeps the refresh token in an httpOnly cookie the browser manages; a native
 * app has no cookie jar, so we keep it in expo-secure-store (iOS Keychain /
 * Android Keystore) instead and send it explicitly. See the `x-koda-client`
 * header handling in app/api/auth/{login,refresh,logout}/route.ts on the
 * backend for the other half of this.
 */
import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "koda_refresh_token";

// Access token: in-memory only, same lifetime as the app process. Lost on
// force-quit by design — bootstrapAuth() re-derives it from the refresh
// token on next launch, same as a page reload does for the web app.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (err) {
    console.warn("[tokenStore] Failed to read refresh token from SecureStore:", err);
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (err) {
    console.warn("[tokenStore] Failed to persist refresh token to SecureStore:", err);
  }
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (err) {
    console.warn("[tokenStore] Failed to clear refresh token from SecureStore:", err);
  }
}
