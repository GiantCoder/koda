import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken } from "@/lib/auth";
import { redis } from "@/src/lib/redis";

const REFRESH_COOKIE_NAME = "koda_refresh_token";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
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
