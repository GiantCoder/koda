/**
 * Wraps auth endpoints: login/refresh/logout (Phase 0) plus register
 * (Phase 1). The rest of onboarding (consent/privacy/profile) is in
 * ./onboarding.ts.
 *
 * NOTE: schemas here duplicate app/api/auth/schema.ts on the web side.
 * That's exactly the kind of drift the roadmap's `packages/shared-schemas`
 * idea is meant to fix — worth doing once there's a third or fourth schema
 * to share, rather than for these two.
 */
import { z } from "zod";
import { authFetch, apiFetch } from "./client";
import { getAccessToken, setAccessToken, setRefreshToken, clearTokens, getRefreshToken } from "./tokenStore";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Subset of app/api/auth/schema.ts's registerSchema that the mobile
// registration screen collects. `privacyPreferences` is left to its
// server-side defaults (all true except marketing) and refined properly on
// the dedicated Privacy screen later in onboarding.
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1, "Display name is required"),
  role: z.enum(["PLAYER", "PARENT", "COACH"]),
  dateOfBirth: z.string().optional(),
  agreedToTerms: z.literal(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export interface KodaUser {
  id: string;
  email: string;
  displayName: string;
  role: "PLAYER" | "PARENT" | "COACH" | "ADMIN";
  // Only reliably present right after login/register (derived from a
  // relation /api/users/me doesn't select) -- treat as optional everywhere else.
  consentStatus?: string;
}

interface LoginResponse {
  user: KodaUser;
  accessToken: string;
  expiresIn: number;
  refreshToken?: string; // present because we send x-koda-client: mobile
}

interface RegisterResponse extends LoginResponse {
  user: KodaUser & { requiresConsent: boolean };
}

export async function login(input: LoginInput): Promise<KodaUser> {
  const parsed = loginSchema.parse(input);
  const data = await authFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: parsed,
  });

  setAccessToken(data.accessToken);
  if (data.refreshToken) {
    await setRefreshToken(data.refreshToken);
  }
  return data.user;
}

export async function register(input: RegisterInput): Promise<KodaUser & { requiresConsent: boolean }> {
  const parsed = registerSchema.parse(input);
  const data = await authFetch<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: parsed,
  });

  setAccessToken(data.accessToken);
  if (data.refreshToken) {
    await setRefreshToken(data.refreshToken);
  }
  return data.user;
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    await authFetch("/api/auth/logout", {
      method: "POST",
      body: refreshToken ? { refreshToken } : undefined,
    });
  } catch (err) {
    // Best-effort: even if the server call fails (offline, etc.) we still
    // want to drop local tokens so the app treats the user as logged out.
    console.warn("[auth] Logout request failed, clearing local session anyway:", err);
  }
  await clearTokens();
}

/** Call once on app launch. Tries to turn a stored refresh token into a
 * fresh access token + user profile, so a relaunch doesn't force a re-login
 * every 15 minutes. Returns null if there's no session to resume. */
export async function bootstrapSession(): Promise<KodaUser | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const refreshed = await authFetch<{ accessToken: string; refreshToken?: string }>(
    "/api/auth/refresh",
    { method: "POST", body: { refreshToken } }
  ).catch(() => null);

  if (!refreshed?.accessToken) {
    await clearTokens();
    return null;
  }

  setAccessToken(refreshed.accessToken);
  if (refreshed.refreshToken) {
    await setRefreshToken(refreshed.refreshToken);
  }

  // We have a valid access token but no user profile yet — /api/users/me
  // (already exists on the backend) gives us that in one call.
  try {
    const me = await apiFetch<KodaUser>("/api/users/me");
    return me;
  } catch (err) {
    console.warn("[auth] Session resumed but /api/users/me failed:", err);
    return null;
  }
}

export function isLoggedInSync(): boolean {
  return getAccessToken() !== null;
}
