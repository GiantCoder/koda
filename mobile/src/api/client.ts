/**
 * Typed fetch wrapper for Koda's Next.js API (the same app/api/** routes the
 * web app calls). Two things it does that a plain fetch() wouldn't:
 *
 *  1. Attaches `Authorization: Bearer <accessToken>` automatically — the
 *     backend's getAuthUser() (lib/get-auth-user.ts) already accepts this on
 *     every protected route, so no backend change was needed for this part.
 *  2. On a 401, tries exactly one silent refresh (via /api/auth/refresh)
 *     and retries the original request once before giving up — this is what
 *     lets a 15-minute access token feel invisible to the rest of the app.
 */
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from "./tokenStore";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3050";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown; // pass a plain object; it's JSON.stringify'd for you
  skipAuth?: boolean; // for auth endpoints that shouldn't attach/refresh a token
};

async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const { body, skipAuth, headers, ...rest } = options;
  const accessToken = skipAuth ? null : getAccessToken();

  return fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "x-koda-client": "mobile",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Attempts one silent refresh using the stored refresh token. Returns the
 * new access token on success, or null if there's no valid session left
 * (caller should treat that as "logged out"). */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const response = await rawRequest("/api/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    skipAuth: true,
  });

  if (!response.ok) {
    await clearTokens();
    return null;
  }

  const data = (await parseJsonSafe(response)) as { accessToken?: string; refreshToken?: string } | null;
  if (!data?.accessToken) {
    await clearTokens();
    return null;
  }

  setAccessToken(data.accessToken);
  if (data.refreshToken) {
    await setRefreshToken(data.refreshToken);
  }
  return data.accessToken;
}

/**
 * Main entry point for calling the Koda API. Throws ApiError on any non-2xx
 * response (after the one refresh-and-retry attempt on 401).
 */
export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await rawRequest(path, options);

  if (response.status === 401 && !options.skipAuth) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      response = await rawRequest(path, options);
    }
  }

  if (!response.ok) {
    const errorBody = (await parseJsonSafe(response)) as
      | { error?: string; code?: string; details?: unknown }
      | null;
    throw new ApiError(
      errorBody?.error ?? `Request to ${path} failed with status ${response.status}`,
      response.status,
      errorBody?.code,
      errorBody?.details
    );
  }

  return (await parseJsonSafe(response)) as T;
}

/** For the auth endpoints themselves (login/register/refresh/logout), which
 * must never attach a token or trigger the refresh-retry loop above. */
export async function authFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  return apiFetch<T>(path, { ...options, skipAuth: true });
}
