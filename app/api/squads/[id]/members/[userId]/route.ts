import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

function requireCoach(user: { id: string; role: string } | null):
  | { error: NextResponse }
  | { user: { id: string; role: string } } {
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "COACH" && user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden: Coach role required" }, { status: 403 }) };
  }
  return { user };
}

/** DELETE /api/squads/:id/members/:userId - Remove member from squad */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const authUser = await getAuthUser(_request);
  const coachCheck = requireCoach(authUser);
  if ("error" in coachCheck) return coachCheck.error;
  const { user } = coachCheck;

  const { id: squadId, userId } = await params;

  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
  });

  if (!squad) {
    return NextResponse.json({ error: "Squad not found" }, { status: 404 });
  }

  if (squad.coachId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Not your squad" }, { status: 403 });
  }

  const deleted = await prisma.squadMember.deleteMany({
    where: {
      squadId,
      userId,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json(
      { error: "Member not found in squad" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Member removed" }, { status: 200 });
}
