import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";

const inviteSchema = z.object({
  importId: z.string().uuid(),
});

const INVITE_EXPIRY_DAYS = 7;

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { importId } = parsed.data;

  const importRecord = await prisma.playCricketImport.findUnique({
    where: { id: importId },
  });

  if (!importRecord || importRecord.coachId !== authUser.id) {
    return NextResponse.json(
      { error: "Import record not found or access denied" },
      { status: 400 }
    );
  }

  if (importRecord.status === "LINKED") {
    return NextResponse.json(
      { error: "Player is already linked to a Koda account" },
      { status: 400 }
    );
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  await prisma.playCricketInviteToken.upsert({
    where: { importId },
    create: {
      importId,
      coachId: authUser.id,
      token,
      expiresAt,
    },
    update: {
      token,
      expiresAt,
      usedAt: null,
    },
  });

  await prisma.playCricketImport.update({
    where: { id: importId },
    data: {
      status: "INVITED",
      invitedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/register?invite=${token}`;

  // MVP: log URL for coach to copy; no email yet
  console.log("[MVP] Invite URL:", inviteUrl);

  return NextResponse.json({
    success: true,
    inviteUrl,
    expiresAt: expiresAt.toISOString(),
  });
}
