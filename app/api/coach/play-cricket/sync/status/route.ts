import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const clubId = searchParams.get("clubId");
  const season = searchParams.get("season") ?? new Date().getFullYear().toString();

  if (!clubId) {
    return NextResponse.json(
      { error: "clubId is required" },
      { status: 400 }
    );
  }

  const log = await prisma.playCricketSyncLog.findFirst({
    where: {
      coachId: authUser.id,
      clubId,
      season,
    },
    orderBy: { startedAt: "desc" },
  });

  if (!log) {
    return NextResponse.json({
      status: null,
      playersUpserted: 0,
      statsRowsUpserted: 0,
      matchesSynced: 0,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
    });
  }

  return NextResponse.json({
    status: log.status,
    playersUpserted: log.playersUpserted,
    statsRowsUpserted: log.statsRowsUpserted,
    matchesSynced: log.matchesSynced,
    startedAt: log.startedAt.toISOString(),
    completedAt: log.completedAt?.toISOString() ?? null,
    errorMessage: log.errorMessage,
  });
}
