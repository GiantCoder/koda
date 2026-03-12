// TODO Phase 3: migrate to Inngest for production throttling
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";
import { decryptApiKey } from "@/lib/encrypt";
import { playCricketClient } from "@/lib/play-cricket/client";
import type { PlayCricketPlayerSummary, PlayCricketTeam } from "@/lib/play-cricket/types";

const syncSchema = z.object({
  clubId: z.string().uuid(),
  season: z.string().regex(/^\d{4}$/).optional(),
});

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { clubId, season: reqSeason } = parsed.data;
  const season = reqSeason ?? new Date().getFullYear().toString();

  const club = await prisma.club.findFirst({
    where: { id: clubId, coachId: authUser.id },
  });
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      ecbApiKeyEncrypted: true,
      ecbApiKeyIv: true,
      ecbApiKeyTag: true,
    },
  });
  if (
    !user ||
    !user.ecbApiKeyEncrypted ||
    !user.ecbApiKeyIv ||
    !user.ecbApiKeyTag
  ) {
    return NextResponse.json({ error: "no_api_key" }, { status: 400 });
  }

  let apiToken: string;
  try {
    apiToken = decryptApiKey({
      ciphertext: user.ecbApiKeyEncrypted,
      iv: user.ecbApiKeyIv,
      tag: user.ecbApiKeyTag,
    });
  } catch {
    return NextResponse.json({ error: "no_api_key" }, { status: 400 });
  }

  const teamsResult = await playCricketClient.getTeams(
    apiToken,
    club.playCricketId
  );
  if (!teamsResult.ok) {
    return NextResponse.json(
      { error: teamsResult.error.message },
      { status: 502 }
    );
  }
  const teams = teamsResult.data as PlayCricketTeam[];
  const teamsFound = teams.length;

  const errors: { teamId: string; reason: string }[] = [];
  const statsResult = await playCricketClient.getPlayerStats(
    apiToken,
    club.playCricketId,
    season
  );

  if (!statsResult.ok) {
    return NextResponse.json(
      { error: statsResult.error.message },
      { status: 502 }
    );
  }

  const allPlayerStats = statsResult.data;

  const personMap = new Map<
    string,
    { teamId: number; teamName: string; stats: PlayCricketPlayerSummary[] }
  >();
  for (const p of allPlayerStats) {
    const personId = String(p.id);
    const team = teams.find((t) => t.id === p.team_id);
    const teamName = team?.name ?? String(p.team_id);
    const existing = personMap.get(personId);
    if (existing) {
      existing.stats.push(p);
    } else {
      personMap.set(personId, {
        teamId: p.team_id,
        teamName,
        stats: [p],
      });
    }
  }
  const playersFound = personMap.size;

  let playersUpserted = 0;
  let statsRowsUpserted = 0;

  for (const [personId, entry] of personMap) {
    const { teamName, stats: statsForPerson } = entry;
    const first = statsForPerson[0]!;
    const rawPayload = first as unknown as Record<string, unknown>;

    const importRecord = await prisma.playCricketImport.upsert({
      where: {
        coachId_playCricketPersonId: {
          coachId: authUser.id,
          playCricketPersonId: personId,
        },
      },
      create: {
        coachId: authUser.id,
        clubId: club.id,
        playCricketPersonId: personId,
        playCricketTeamId: String(first.team_id),
        firstName: first.first_name,
        lastName: first.last_name,
        rawPayload: rawPayload as object,
        status: "PENDING",
      },
      update: {
        firstName: first.first_name,
        lastName: first.last_name,
        playCricketTeamId: String(first.team_id),
        rawPayload: rawPayload as object,
        updatedAt: new Date(),
      },
    });
    playersUpserted++;

    for (const s of statsForPerson) {
      const compType = s.competition_type ?? "Limited Overs";
      await prisma.playCricketPlayerStats.upsert({
        where: {
          importId_season_competitionType: {
            importId: importRecord.id,
            season,
            competitionType: compType,
          },
        },
        create: {
          importId: importRecord.id,
          coachId: authUser.id,
          clubId: club.id,
          playCricketPersonId: personId,
          playCricketTeamId: String(s.team_id),
          teamName,
          season,
          competitionType: compType,
          battingInnings: s.batting_innings ?? 0,
          battingNotOuts: s.batting_not_outs ?? 0,
          battingRuns: s.batting_runs ?? 0,
          battingHighest: s.batting_highest ?? 0,
          battingAverage: s.batting_average ?? null,
          battingStrikeRate: s.batting_strike_rate ?? null,
          battingFifties: s.batting_fifties ?? 0,
          battingHundreds: s.batting_hundreds ?? 0,
          bowlingOvers: s.bowling_overs ?? 0,
          bowlingWickets: s.bowling_wickets ?? 0,
          bowlingRuns: s.bowling_runs ?? 0,
          bowlingAverage: s.bowling_average ?? null,
          bowlingEconomy: s.bowling_economy ?? null,
          bowlingBestFigures: s.bowling_best_figures ?? null,
          bowlingFiveWickets: s.bowling_five_wickets ?? 0,
          fieldingCatches: s.fielding_catches ?? 0,
          fieldingStumpings: s.fielding_stumpings ?? 0,
          fieldingRunOuts: s.fielding_run_outs ?? 0,
          syncedAt: new Date(),
        },
        update: {
          battingInnings: s.batting_innings ?? 0,
          battingNotOuts: s.batting_not_outs ?? 0,
          battingRuns: s.batting_runs ?? 0,
          battingHighest: s.batting_highest ?? 0,
          battingAverage: s.batting_average ?? null,
          battingStrikeRate: s.batting_strike_rate ?? null,
          battingFifties: s.batting_fifties ?? 0,
          battingHundreds: s.batting_hundreds ?? 0,
          bowlingOvers: s.bowling_overs ?? 0,
          bowlingWickets: s.bowling_wickets ?? 0,
          bowlingRuns: s.bowling_runs ?? 0,
          bowlingAverage: s.bowling_average ?? null,
          bowlingEconomy: s.bowling_economy ?? null,
          bowlingBestFigures: s.bowling_best_figures ?? null,
          bowlingFiveWickets: s.bowling_five_wickets ?? 0,
          fieldingCatches: s.fielding_catches ?? 0,
          fieldingStumpings: s.fielding_stumpings ?? 0,
          fieldingRunOuts: s.fielding_run_outs ?? 0,
          syncedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      statsRowsUpserted++;
    }
  }

  const syncedAt = new Date();
  return NextResponse.json({
    success: true,
    season,
    teamsFound,
    playersFound,
    playersUpserted,
    statsRowsUpserted,
    errors,
    syncedAt: syncedAt.toISOString(),
  });
}
