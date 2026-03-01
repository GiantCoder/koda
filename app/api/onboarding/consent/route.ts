import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { consentRequestSchema } from "../schema";

const TOKEN_EXPIRY_HOURS = 24;

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = consentRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: "Validation failed", details: validation.error.flatten() }, { status: 400 });
  }

  const token = randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setHours(tokenExpiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  await prisma.consentRecord.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      guardianName: validation.data.guardianName,
      guardianEmail: validation.data.guardianEmail,
      guardianRelationship: validation.data.guardianRelationship,
      verificationToken: token,
      tokenExpiresAt,
      consentStatus: "PENDING",
    },
    update: {
      guardianName: validation.data.guardianName,
      guardianEmail: validation.data.guardianEmail,
      guardianRelationship: validation.data.guardianRelationship,
      verificationToken: token,
      tokenExpiresAt,
      consentStatus: "PENDING",
    },
  });

  return NextResponse.json({ success: true, message: "Consent request recorded." });
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const consent = await prisma.consentRecord.findUnique({
    where: { userId: user.id },
  });

  if (!consent) {
    return NextResponse.json({
      consentStatus: "NOT_REQUIRED",
      requiresConsent: false,
    });
  }

  return NextResponse.json({
    consentStatus: consent.consentStatus,
    requiresConsent: consent.consentStatus === "PENDING",
    guardianEmail: consent.guardianEmail ?? undefined,
    tokenExpiresAt: consent.tokenExpiresAt?.toISOString(),
  });
}
