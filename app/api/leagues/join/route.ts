import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

const joinSchema = z.object({
  joinCode: z.string().length(6),
});

/**
 * POST /api/leagues/join — Join a league by code.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const league = await prisma.league.findUnique({
    where: { joinCode: parsed.data.joinCode.toUpperCase(), isActive: true },
    include: {
      seasons: {
        where: { isActive: true },
        orderBy: { seasonNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!league) {
    return NextResponse.json({ error: "Invalid or inactive join code" }, { status: 400 });
  }

  const existing = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already a member of this league" }, { status: 400 });
  }

  const season = league.seasons[0];
  if (!season) {
    return NextResponse.json({ error: "League has no active season" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.leagueMember.create({
      data: { leagueId: league.id, userId: user.id },
    }),
    prisma.leagueEntry.create({
      data: {
        leagueSeasonId: season.id,
        userId: user.id,
        points: 0,
        goldStars: 0,
        analysisCount: 0,
        updatedAt: new Date(),
      },
    }),
  ]);

  const currentSeason = await prisma.leagueSeason.findUniqueOrThrow({
    where: { id: season.id },
  });

  return NextResponse.json({
    league: { id: league.id, name: league.name, scope: league.scope },
    currentSeason,
  });
}
