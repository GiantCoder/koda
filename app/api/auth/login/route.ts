import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { loginSchema } from "../schema";
import { verifyPassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { ConsentStatus } from "@prisma/client";
import { redis } from "@/src/lib/redis";

const REFRESH_COOKIE_NAME = "koda_refresh_token";
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "BAD_REQUEST" }, { status: 400 });
  }

  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password } = validation.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { consentRecord: true },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { error: "Invalid email or password", code: "INVALID_CREDENTIALS" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password", code: "INVALID_CREDENTIALS" },
      { status: 401 }
    );
  }

  if (!user.emailVerified) {
    return NextResponse.json({ error: "Email not verified", code: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  }

  if (!user.isActive) {
    return NextResponse.json(
      {
        error: "Account is inactive",
        code: "ACCOUNT_INACTIVE",
        consentPending: user.consentRecord?.consentStatus === ConsentStatus.PENDING,
      },
      { status: 403 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = await generateAccessToken({
    sub: user.id,
    userId: user.id,
    role: user.role,
    email: user.email,
    ageGroup: user.ageGroup,
  });
  const { token: refreshToken, tokenId } = await generateRefreshToken({
    sub: user.id,
    userId: user.id,
    role: user.role,
    email: user.email,
    ageGroup: user.ageGroup,
  });
  try {
    await redis.set(`refresh:${user.id}:${tokenId}`, "1", "EX", REFRESH_TTL_SECONDS);
  } catch (err) {
    console.error("[auth/login] Redis set failed (refresh token not stored):", err);
    // Still return success so login works when Redis is down (e.g. dev); refresh may not work until Redis is up
  }

  // Native clients (Expo/React Native) can't rely on the httpOnly cookie below —
  // there's no browser cookie jar. They identify themselves with this header and
  // get the refresh token back in the body instead, to store in expo-secure-store.
  // Web behavior (cookie-only, refresh token never touches page JS) is unchanged.
  const isMobileClient = request.headers.get("x-koda-client") === "mobile";

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName || user.name,
      role: user.role,
      consentStatus: user.consentRecord?.consentStatus ?? ConsentStatus.NOT_REQUIRED,
    },
    accessToken,
    expiresIn: 900,
    ...(isMobileClient ? { refreshToken } : {}),
  });

  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  });

  return response;
}
