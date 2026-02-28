import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { randomBytes } from "crypto";

const TOKEN_EXPIRY_HOURS = 24;

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const consent = await prisma.consentRecord.findUnique({
    where: { userId: user.id },
  });

  if (!consent) {
    return NextResponse.json(
      { error: "No consent record found. Submit a consent request first." },
      { status: 400 }
    );
  }

  if (consent.consentStatus === "APPROVED") {
    return NextResponse.json(
      { error: "Consent is already approved" },
      { status: 400 }
    );
  }

  const token = randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setHours(tokenExpiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  await prisma.consentRecord.update({
    where: { userId: user.id },
    data: { verificationToken: token, tokenExpiresAt },
  });

  // TODO: Enqueue email job
  console.info(
    `[MVP] Consent resend email would be sent to ${consent.guardianEmail} (not sent)`
  );

  return NextResponse.json({
    success: true,
    message: "Verification email resent.",
  });
}
