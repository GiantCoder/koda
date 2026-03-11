import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { getSettings } from "@/lib/gamification/settings";

/**
 * GET /api/gamification/summary
 * Returns current user's gamification overview: points, streak, gold stars, recent badges, league summary, point earn source.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [userPoints, recentBadges, leagueSummary, settings] = await Promise.all([
    prisma.userPoints.findUnique({
      where: { userId: user.id },
    }),
    prisma.userBadge.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: "desc" },
      take: 3,
      include: { badgeDefinition: true },
    }),
    getLeagueSummary(user.id),
    getSettings(),
  ]);

  const summary = {
    totalPoints: userPoints?.totalPoints ?? 0,
    currentSeasonPts: userPoints?.currentSeasonPts ?? 0,
    goldStarCount: userPoints?.goldStarCount ?? 0,
    practiceStreakDays: userPoints?.practiceStreakDays ?? 0,
    recentBadges: recentBadges.map((ub) => ({
      definition: ub.badgeDefinition,
      earnedAt: ub.earnedAt,
    })),
    leagueSummary,
    pointEarnSource: settings.pointEarnSource,
  };

  return NextResponse.json(summary);
}

async function getLeagueSummary(
  userId: string
): Promise<{ leagueName: string; rank: number; totalMembers: number } | null> {
  const membership = await prisma.leagueMember.findFirst({
    where: { userId },
    include: {
      league: {
        include: {
          seasons: {
            where: { isActive: true },
            orderBy: { seasonNumber: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!membership?.league?.seasons?.length) return null;
  const season = membership.league.seasons[0];
  const entry = await prisma.leagueEntry.findUnique({
    where: {
      leagueSeasonId_userId: { leagueSeasonId: season.id, userId },
    },
  });
  const totalMembers = await prisma.leagueEntry.count({
    where: { leagueSeasonId: season.id },
  });
  const rank = entry?.currentRank ?? totalMembers;
  return {
    leagueName: membership.league.name,
    rank,
    totalMembers,
  };
}
