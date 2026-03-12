import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!authUser.playCricketPersonId) {
    return NextResponse.json(
      { error: "Play-Cricket not linked" },
      { status: 404 }
    );
  }

  const [statsRows, recentInnings] = await Promise.all([
    prisma.playCricketPlayerStats.findMany({
      where: { playCricketPersonId: authUser.playCricketPersonId },
      orderBy: [{ season: "desc" }, { syncedAt: "desc" }],
    }),
    prisma.playCricketMatchInning.findMany({
      where: { playCricketPersonId: authUser.playCricketPersonId },
      include: { match: true },
      orderBy: { match: { matchDate: "desc" } },
      take: 10,
    }),
  ]);

  const recentInningsPayload = recentInnings.map((inn) => ({
    matchDate: inn.match.matchDate?.toISOString() ?? "",
    homeTeamName: inn.match.homeTeamName ?? "",
    awayTeamName: inn.match.awayTeamName ?? "",
    battingRuns: inn.battingRuns,
    battingBalls: inn.battingBalls,
    battingDismissal: inn.battingDismissal,
    bowlingOvers: inn.bowlingOvers,
    bowlingWickets: inn.bowlingWickets,
    bowlingRuns: inn.bowlingRuns,
  }));

  const statsPayload = statsRows.map((s) => ({
    season: s.season,
    competitionType: s.competitionType,
    battingInnings: s.battingInnings,
    battingRuns: s.battingRuns,
    battingAverage: s.battingAverage,
    battingHighest: s.battingHighest,
    bowlingWickets: s.bowlingWickets,
    bowlingRuns: s.bowlingRuns,
    fieldingCatches: s.fieldingCatches,
    fieldingStumpings: s.fieldingStumpings,
    fieldingRunOuts: s.fieldingRunOuts,
  }));

  return NextResponse.json({
    playCricketPersonId: authUser.playCricketPersonId,
    stats: statsPayload,
    recentInnings: recentInningsPayload,
  });
}
