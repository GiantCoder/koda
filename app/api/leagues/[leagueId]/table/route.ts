import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * GET /api/leagues/[leagueId]/table — Leaderboard for current active season.
 * Auth: user must be a member or league scope must be GLOBAL.
 * Returns entries ordered by points DESC; includes userEntry if the user is in the league.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leagueId } = await params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId, isActive: true },
    include: {
      seasons: {
        where: { isActive: true },
        orderBy: { seasonNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const season = league.seasons[0];
  if (!season) {
    return NextResponse.json({ error: "No active season" }, { status: 404 });
  }

  const membership = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
  });
  const isGlobal = league.scope === "GLOBAL";
  if (!membership && !isGlobal) {
    return NextResponse.json({ error: "Forbidden: not a member" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  let limit = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  if (Number.isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  const cursor = searchParams.get("cursor") ?? undefined;

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

  let userEntry: (typeof items)[0] | null = null;
  if (membership) {
    const me = await prisma.leagueEntry.findUnique({
      where: {
        leagueSeasonId_userId: { leagueSeasonId: season.id, userId: user.id },
      },
      include: {
        user: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });
    if (me && !items.some((e) => e.userId === user.id)) {
      userEntry = me;
    }
  }

  return NextResponse.json({
    entries: items,
    nextCursor,
    userEntry,
  });
}
