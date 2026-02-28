import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

/** GET /api/sessions - List upcoming sessions (coach's sessions or sessions user is attending) */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const from = searchParams.get("from");
  const now = from ? new Date(from) : new Date();

  const sessions = await prisma.session.findMany({
    where: {
      scheduledAt: { gte: now },
      OR: [
        { coachId: authUser.id },
        { players: { some: { id: authUser.id } } },
      ],
    },
    include: {
      coach: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      squad: {
        select: {
          id: true,
          name: true,
          ageGroup: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  const payload = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    scheduledAt: s.scheduledAt,
    endsAt: s.endsAt,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    attendees: s.attendees,
    coach: s.coach,
    squad: s.squad,
  }));

  return NextResponse.json({ sessions: payload });
}
