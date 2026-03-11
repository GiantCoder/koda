import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { registerSchema } from "../schema";
import { hashPassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { getAgeFromDateOfBirth, getConsentStatusForAge } from "@/lib/age-consent";
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

  const validation = registerSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "VALIDATION_ERROR", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const data = validation.data;
  const dateOfBirth = data.dateOfBirth
    ? new Date(data.dateOfBirth)
    : null;
  const age = getAgeFromDateOfBirth(dateOfBirth);
  // COACH/PARENT without DOB: treat as adult so account is active; PLAYER without DOB stays PENDING until consent/DOB
  const consentStatus =
    age === null && (data.role === "COACH" || data.role === "PARENT")
      ? ConsentStatus.NOT_REQUIRED
      : getConsentStatusForAge(age);

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists", code: "EMAIL_EXISTS" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.$transaction(async (tx) =>
    tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        displayName: data.displayName,
        name: data.displayName,
        role: data.role,
        dateOfBirth,
        isActive: consentStatus === ConsentStatus.NOT_REQUIRED,
        emailVerified: true,
        consentRecord: {
          create: {
            consentStatus,
          },
        },
        privacyPreferences: {
          create: {
            performanceAnalytics: data.privacyPreferences.performanceAnalytics,
            marketingCommunications: data.privacyPreferences.marketingCommunications,
            coachParentComms: data.privacyPreferences.coachParentComms,
          },
        },
      },
      include: {
        consentRecord: true,
        privacyPreferences: true,
      },
    })
  );

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
  await redis.set(`refresh:${user.id}:${tokenId}`, "1", "EX", REFRESH_TTL_SECONDS);

  const response = NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        consentStatus: user.consentRecord?.consentStatus ?? ConsentStatus.NOT_REQUIRED,
        requiresConsent: consentStatus !== ConsentStatus.NOT_REQUIRED,
      },
      accessToken,
      expiresIn: 900,
    },
    { status: 201 }
  );

  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
  });

  return response;
}
