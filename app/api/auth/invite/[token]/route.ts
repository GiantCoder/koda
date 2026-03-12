import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const inviteToken = await prisma.playCricketInviteToken.findUnique({
    where: { token },
    include: { import: true },
  });

  if (!inviteToken) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }

  if (inviteToken.usedAt) {
    return NextResponse.json(
      { error: "Invite already used" },
      { status: 410 }
    );
  }

  if (new Date() > inviteToken.expiresAt) {
    return NextResponse.json(
      { error: "Invite expired" },
      { status: 410 }
    );
  }

  const imp = inviteToken.import;
  return NextResponse.json({
    valid: true,
    firstName: imp.firstName,
    lastName: imp.lastName,
    playCricketPersonId: imp.playCricketPersonId,
    importId: imp.id,
  });
}
