import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

/**
 * GET /api/dashboard/summary
 * Role-aware dashboard summary. MVP: user info + placeholder counts.
 * Full impl would aggregate from Video, Analysis, Session when schema extended.
 */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // MVP: Schema has no Video/Analysis/Session. Return placeholder counts.
  // Full impl: prisma.video.count, prisma.analysis.count, etc.
  const summary = {
    user: {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      memberSince: user.createdAt,
    },
    stats: {
      totalAnalyses: 0,
      totalVideos: 0,
      upcomingSessions: 0,
      latestGrade: null as string | null,
    },
  };

  return NextResponse.json(summary);
}
