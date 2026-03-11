import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { generateJoinCode } from "@/lib/gamification/leagues";

const DEFAULT_SEASON_DAYS = 30;

const createLeagueSchema = z.object({
  name: z.string().min(1).max(200),
  ageGroup: z.enum(["UNDER_10", "UNDER_12", "UNDER_14", "UNDER_16", "UNDER_18", "SENIOR"]).optional(),
  seasonLengthDays: z.union([z.literal(30), z.literal(60), z.literal(90)]).optional(),
});

/**
 * GET /api/leagues — Leagues the current user is a member of, with current season and rank.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.leagueMember.findMany({
    where: { userId: user.id },
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

  const leagues = await Promise.all(
    memberships.map(async (m) => {
      const season = m.league.seasons[0] ?? null;
      let userRank: number | null = null;
      let memberCount = 0;
      if (season) {
        const entry = await prisma.leagueEntry.findUnique({
          where: {
            leagueSeasonId_userId: { leagueSeasonId: season.id, userId: user.id },
          },
        });
        userRank = entry?.currentRank ?? null;
        memberCount = await prisma.leagueEntry.count({
          where: { leagueSeasonId: season.id },
        });
      }
      return {
        id: m.league.id,
        name: m.league.name,
        scope: m.league.scope,
        currentSeason: season,
        userRank,
        memberCount,
      };
    })
  );

  return NextResponse.json({ leagues });
}

/**
 * POST /api/leagues — Create a new CUSTOM league.
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

  const parsed = createLeagueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, ageGroup, seasonLengthDays = 30 } = parsed.data;
  const joinCode = await generateJoinCode();

  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + seasonLengthDays);

  const league = await prisma.league.create({
    data: {
      name,
      scope: "CUSTOM",
      createdByUserId: user.id,
      joinCode,
      ageGroup: ageGroup ?? null,
      isActive: true,
    },
  });

  const season = await prisma.leagueSeason.create({
    data: {
      leagueId: league.id,
      seasonNumber: 1,
      startsAt,
      endsAt,
      isActive: true,
    },
  });

  await prisma.leagueMember.create({
    data: { leagueId: league.id, userId: user.id },
  });

  await prisma.leagueEntry.create({
    data: {
      leagueSeasonId: season.id,
      userId: user.id,
      points: 0,
      goldStars: 0,
      analysisCount: 0,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    league: { ...league, joinCode },
    season,
  });
}
