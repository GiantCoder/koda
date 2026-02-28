import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { loginSchema } from "../schema";
import { verifyPassword, signJwt } from "@/lib/auth";
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

  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
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
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  if (!user.isActive) {
    return NextResponse.json(
      {
        error: "Account is inactive",
        requiresConsent:
          user.consentRecord?.consentStatus === ConsentStatus.PENDING,
      },
      { status: 403 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await signJwt({
    sub: user.id,
    userId: user.id,
    role: user.role,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName || user.name,
      role: user.role,
      consentStatus: user.consentRecord?.consentStatus ?? ConsentStatus.NOT_REQUIRED,
    },
    accessToken: token,
    expiresIn: 900,
  });
}
