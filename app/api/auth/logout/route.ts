import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken } from "@/lib/auth";
import { redis } from "@/src/lib/redis";

const REFRESH_COOKIE_NAME = "koda_refresh_token";

export async function POST(request: NextRequest) {
  const cookieToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  // Same native-client fallback as /api/auth/refresh: no cookie jar on mobile,
  // so it sends the refresh token it's revoking in the JSON body instead.
  let bodyRefreshToken: string | undefined;
  if (!cookieToken) {
    try {
      const body = (await request.json()) as { refreshToken?: unknown };
      if (typeof body?.refreshToken === "string") {
        bodyRefreshToken = body.refreshToken;
      }
    } catch {
      // No/invalid JSON body — nothing to revoke beyond the cookie check below.
    }
  }

  const refreshToken = cookieToken ?? bodyRefreshToken;
  if (refreshToken) {
    const payload = await verifyRefreshToken(refreshToken);
    if (payload?.userId && payload.tokenId) {
      await redis.del(`refresh:${payload.userId}:${payload.tokenId}`);
    }
  }

  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
