import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

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
