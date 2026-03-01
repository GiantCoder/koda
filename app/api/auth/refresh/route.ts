import { NextRequest, NextResponse } from "next/server";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "@/lib/auth";
import { redis } from "@/src/lib/redis";

const REFRESH_COOKIE_NAME = "koda_refresh_token";
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refresh token", code: "MISSING_REFRESH_TOKEN" }, { status: 401 });
  }

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload?.userId || !payload.tokenId) {
    return NextResponse.json({ error: "Invalid refresh token", code: "INVALID_REFRESH_TOKEN" }, { status: 401 });
  }

  const oldKey = `refresh:${payload.userId}:${payload.tokenId}`;
  const exists = await redis.get(oldKey);
  if (!exists) {
    return NextResponse.json({ error: "Refresh token revoked", code: "REFRESH_TOKEN_REVOKED" }, { status: 401 });
  }

  await redis.del(oldKey);

  const accessToken = await generateAccessToken({
    sub: payload.userId,
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
    ageGroup: payload.ageGroup,
  });
  const { token: newRefreshToken, tokenId } = await generateRefreshToken({
    sub: payload.userId,
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
    ageGroup: payload.ageGroup,
  });
  await redis.set(`refresh:${payload.userId}:${tokenId}`, "1", "EX", REFRESH_TTL_SECONDS);

  const response = NextResponse.json({ accessToken, expiresIn: 900 });
  response.cookies.set(REFRESH_COOKIE_NAME, newRefreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  });
  return response;
}
