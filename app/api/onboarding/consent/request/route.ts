import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { consentRequestSchema } from "../../schema";
import { getAuthUser } from "@/lib/get-auth-user";
import { requiresGuardianConsent, getAgeFromDateOfBirth } from "@/lib/age-consent";
import { randomBytes } from "crypto";

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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validation = consentRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { consentRecord: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const age = getAgeFromDateOfBirth(dbUser.dateOfBirth);
  if (!requiresGuardianConsent(age)) {
    return NextResponse.json(
      { error: "Guardian consent is not required for this account" },
      { status: 400 }
    );
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

  // TODO: Enqueue email job to send consent link to guardianEmail
  // For MVP, log that email would be sent
  console.info(
    `[MVP] Consent email would be sent to ${validation.data.guardianEmail} with token (link not sent)`
  );

  return NextResponse.json({
    success: true,
    message: "Consent request submitted. Guardian will receive an email.",
  });
}
