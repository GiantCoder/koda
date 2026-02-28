import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { addMemberSchema } from "../../schema";
import { getAgeFromDateOfBirth, isMinor } from "@/lib/age-consent";

function requireCoach(user: { id: string; role: string } | null):
  | { error: NextResponse }
  | { user: { id: string; role: string } } {
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "COACH" && user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden: Coach role required" }, { status: 403 }) };
  }
  return { user };
}

/** POST /api/squads/:id/members - Add member to squad */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  const coachCheck = requireCoach(authUser);
  if ("error" in coachCheck) return coachCheck.error;
  const { user } = coachCheck;

  const { id: squadId } = await params;

  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
  });

  if (!squad) {
    return NextResponse.json({ error: "Squad not found" }, { status: 404 });
  }

  if (squad.coachId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Not your squad" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, dateOfBirth: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const member = await prisma.squadMember.create({
      data: {
        squadId,
        userId: parsed.data.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            dateOfBirth: true,
            ageGroup: true,
            role: true,
          },
        },
      },
    });

    const age = getAgeFromDateOfBirth(member.user.dateOfBirth);
    return NextResponse.json(
      {
        id: member.user.id,
        displayName: member.user.displayName,
        email: member.user.email,
        ageGroup: member.user.ageGroup,
        role: member.user.role,
        joinedAt: member.joinedAt,
        isMinor: isMinor(age),
      },
      { status: 201 }
    );
  } catch (e) {
    const prismaError = e as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { error: "User is already a member of this squad" },
        { status: 409 }
      );
    }
    throw e;
  }
}
