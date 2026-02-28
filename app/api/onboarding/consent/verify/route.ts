import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { consentVerifySchema } from "../../schema";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token");
  if (!token) {
    try {
      const body = (await request.json()) as { token?: string };
      token = body?.token ?? null;
    } catch {
      token = null;
    }
  }

  const validation = consentVerifySchema.safeParse({ token: token ?? "" });
  if (!validation.success || !token) {
    return NextResponse.json(
      { error: "Verification token is required" },
      { status: 400 }
    );
  }

  const consent = await prisma.consentRecord.findFirst({
    where: { verificationToken: token },
    include: { user: true },
  });

  if (!consent) {
    return NextResponse.json(
      { error: "Invalid or expired verification token" },
      { status: 400 }
    );
  }

  if (consent.consentStatus === "APPROVED") {
    return NextResponse.json({
      success: true,
      message: "Consent was already approved",
    });
  }

  if (consent.consentStatus === "REJECTED") {
    return NextResponse.json(
      { error: "Consent was previously rejected" },
      { status: 400 }
    );
  }

  if (consent.tokenExpiresAt && consent.tokenExpiresAt < new Date()) {
    return NextResponse.json(
      { error: "Verification token has expired" },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.consentRecord.update({
      where: { id: consent.id },
      data: {
        consentStatus: "APPROVED",
        approvedAt: new Date(),
        verificationToken: null,
        tokenExpiresAt: null,
      },
    }),
    prisma.user.update({
      where: { id: consent.userId },
      data: { isActive: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Consent approved. The account is now active.",
  });
}
