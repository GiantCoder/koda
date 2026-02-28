import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { registerSchema } from "../schema";
import { hashPassword, signJwt } from "@/lib/auth";
import {
  getAgeFromDateOfBirth,
  getConsentStatusForAge,
} from "@/lib/age-consent";
import { ConsentStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validation = registerSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const data = validation.data;
  const dateOfBirth = data.dateOfBirth
    ? new Date(data.dateOfBirth)
    : null;
  const age = getAgeFromDateOfBirth(dateOfBirth);
  const consentStatus = getConsentStatusForAge(age);

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      displayName: data.displayName,
      name: data.displayName,
      role: data.role,
      dateOfBirth,
      isActive: consentStatus === ConsentStatus.NOT_REQUIRED,
      consentRecord:
        consentStatus !== ConsentStatus.NOT_REQUIRED
          ? {
              create: {
                consentStatus,
              },
            }
          : undefined,
      privacyPreferences: {
        create: {
          performanceAnalytics: data.privacyPreferences.performanceAnalytics,
          marketingCommunications:
            data.privacyPreferences.marketingCommunications,
          coachParentComms: data.privacyPreferences.coachParentComms,
        },
      },
    },
    include: {
      consentRecord: true,
      privacyPreferences: true,
    },
  });

  const token = await signJwt({
    sub: user.id,
    userId: user.id,
    role: user.role,
  });

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        consentStatus: user.consentRecord?.consentStatus ?? ConsentStatus.NOT_REQUIRED,
        requiresConsent: consentStatus !== ConsentStatus.NOT_REQUIRED,
      },
      accessToken: token,
      expiresIn: 900,
    },
    { status: 201 }
  );
}
