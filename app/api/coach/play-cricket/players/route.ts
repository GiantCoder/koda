import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";

const SORT_FIELDS = [
  "battingRuns",
  "battingAverage",
  "bowlingWickets",
  "bowlingAverage",
  "fieldingCatches",
  "name",
] as const;
const COMPETITION_TYPES = ["Limited Overs", "T20", "Declaration"] as const;

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
  if (!clubId) {
    return NextResponse.json(
      { error: "clubId is required" },
      { status: 400 }
    );
  }

  const season =
    searchParams.get("season") ?? new Date().getFullYear().toString();
  const teamId = searchParams.get("teamId") ?? undefined;
  const competitionType = searchParams.get("competitionType") ?? undefined;
  const search = searchParams.get("search")?.trim() ?? undefined;
  const sortBy = (searchParams.get("sortBy") ?? "battingRuns") as (typeof SORT_FIELDS)[number];
  const sortDir = (searchParams.get("sortDir") ?? "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10)));

  const club = await prisma.club.findFirst({
    where: { id: clubId, coachId: authUser.id },
  });
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const importWhere: Record<string, unknown> = {
    coachId: authUser.id,
    clubId,
  };
  if (search) {
    importWhere.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
    ];
  }

  const statsWhere: Record<string, unknown> = {
    clubId,
    season,
  };
  if (competitionType && COMPETITION_TYPES.includes(competitionType as (typeof COMPETITION_TYPES)[number])) {
    statsWhere.competitionType = competitionType;
  }
  if (teamId) {
    statsWhere.playCricketTeamId = teamId;
  }

  const importWithStatsWhere = {
    ...importWhere,
    stats: {
      some: statsWhere,
    },
  };

  const [imports, total, metaStats] = await Promise.all([
    prisma.playCricketImport.findMany({
      where: importWithStatsWhere,
      include: {
        stats: {
          where: statsWhere,
          orderBy: { syncedAt: "desc" },
        },
      },
    }),
    prisma.playCricketImport.count({ where: importWithStatsWhere }),
    prisma.playCricketPlayerStats.findMany({
      where: { clubId, coachId: authUser.id },
      select: {
        season: true,
        playCricketTeamId: true,
        teamName: true,
        syncedAt: true,
      },
    }),
  ]);

  const playersWithStats = imports
    .filter((imp) => imp.stats.length > 0)
    .map((imp) => ({
      importId: imp.id,
      playCricketPersonId: imp.playCricketPersonId,
      firstName: imp.firstName,
      lastName: imp.lastName,
      teamName: imp.stats[0]!.teamName,
      status: imp.status,
      linkedUserId: imp.linkedUserId,
      stats: imp.stats.map((s) => ({
        season: s.season,
        competitionType: s.competitionType,
        battingInnings: s.battingInnings,
        battingRuns: s.battingRuns,
        battingAverage: s.battingAverage,
        battingHighest: s.battingHighest,
        battingFifties: s.battingFifties,
        battingHundreds: s.battingHundreds,
        battingStrikeRate: s.battingStrikeRate,
        bowlingWickets: s.bowlingWickets,
        bowlingAverage: s.bowlingAverage,
        bowlingEconomy: s.bowlingEconomy,
        bowlingBestFigures: s.bowlingBestFigures,
        bowlingFiveWickets: s.bowlingFiveWickets,
        fieldingCatches: s.fieldingCatches,
        fieldingStumpings: s.fieldingStumpings,
        fieldingRunOuts: s.fieldingRunOuts,
        syncedAt: s.syncedAt.toISOString(),
      })),
    }));

  const sortField = SORT_FIELDS.includes(sortBy) ? sortBy : "battingRuns";
  const mult = sortDir === "asc" ? 1 : -1;
  playersWithStats.sort((a, b) => {
    const s1 = a.stats[0];
    const s2 = b.stats[0];
    if (!s1 || !s2) return 0;
    if (sortBy === "name") {
      const n1 = `${a.firstName} ${a.lastName}`;
      const n2 = `${b.firstName} ${b.lastName}`;
      return mult * n1.localeCompare(n2);
    }
    const v1 = (s1 as Record<string, unknown>)[sortField] as number | null;
    const v2 = (s2 as Record<string, unknown>)[sortField] as number | null;
    const num1 = v1 ?? -Infinity;
    const num2 = v2 ?? -Infinity;
    return mult * (num1 - num2);
  });

  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginated = playersWithStats.slice(start, start + pageSize);

  const seasons = [...new Set(metaStats.map((s) => s.season))].sort(
    (a, b) => parseInt(b, 10) - parseInt(a, 10)
  );
  const teamsMap = new Map<string, string>();
  for (const s of metaStats) {
    if (!teamsMap.has(s.playCricketTeamId)) {
      teamsMap.set(s.playCricketTeamId, s.teamName);
    }
  }
  const teams = Array.from(teamsMap.entries()).map(([id, name]) => ({
    id,
    name,
  }));
  const lastSynced = metaStats.reduce((acc, s) => {
    const t = s.syncedAt.getTime();
    return t > acc ? t : acc;
  }, 0);

  return NextResponse.json({
    players: paginated,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
    },
    meta: {
      seasons,
      teams,
      lastSyncedAt: lastSynced ? new Date(lastSynced).toISOString() : null,
    },
  });
}
