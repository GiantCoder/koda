import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const VALID_AGE_GROUPS = ["UNDER_10", "UNDER_12", "UNDER_14", "UNDER_16", "UNDER_18", "SENIOR"] as const;

/**
 * GET /api/leagues/global — Koda Global leaderboard. No auth required.
 * Query: ageGroup (required), limit (default 50), cursor.
 * Uses or creates the system GLOBAL league for the given age group.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ageGroup = searchParams.get("ageGroup");
  if (!ageGroup || !VALID_AGE_GROUPS.includes(ageGroup as (typeof VALID_AGE_GROUPS)[number])) {
    return NextResponse.json(
      { error: "ageGroup is required and must be one of: " + VALID_AGE_GROUPS.join(", ") },
      { status: 400 }
    );
  }

  let limit = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  if (Number.isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  const cursor = searchParams.get("cursor") ?? undefined;

  let league = await prisma.league.findFirst({
    where: { scope: "GLOBAL", ageGroup: ageGroup as (typeof VALID_AGE_GROUPS)[number], isActive: true },
    include: {
      seasons: {
        where: { isActive: true },
        orderBy: { seasonNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!league) {
    const firstUser = await prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!firstUser) {
      return NextResponse.json({ entries: [], nextCursor: null });
    }
    const joinCode = `GL${ageGroup.slice(-2)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    league = await prisma.league.create({
      data: {
        name: `Koda Global ${ageGroup.replace("_", " ")}`,
        scope: "GLOBAL",
        createdByUserId: firstUser.id,
        joinCode,
        ageGroup: ageGroup as (typeof VALID_AGE_GROUPS)[number],
        isActive: true,
      },
    });
    const seasonStarts = new Date();
    const seasonEnds = new Date(seasonStarts);
    seasonEnds.setDate(seasonEnds.getDate() + 30);
    await prisma.leagueSeason.create({
      data: {
        leagueId: league.id,
        seasonNumber: 1,
        startsAt: seasonStarts,
        endsAt: seasonEnds,
        isActive: true,
      },
    });
    league = await prisma.league.findUniqueOrThrow({
      where: { id: league.id },
      include: {
        seasons: {
          where: { isActive: true },
          orderBy: { seasonNumber: "desc" },
          take: 1,
        },
      },
    });
  }

  const season = league.seasons?.[0];
  if (!season) {
    return NextResponse.json({ entries: [], nextCursor: null });
  }

  const entries = await prisma.leagueEntry.findMany({
    where: { leagueSeasonId: season.id },
    orderBy: [{ points: "desc" }, { goldStars: "desc" }],
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: {
      user: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
    },
  });

  const hasMore = entries.length > limit;
  const items = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({
    entries: items.map((e) => ({
      ...e,
      user: {
        id: e.user.id,
        displayName: e.user.displayName ?? "Player",
        avatarUrl: e.user.avatarUrl,
      },
    })),
    nextCursor,
  });
}
