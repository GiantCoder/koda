import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";

const analyseSchema = z.object({
  clubId: z.string().uuid(),
  season: z.string().regex(/^\d{4}$/),
  competitionType: z.string().optional(),
});

const SYSTEM_PROMPT = `You are an expert cricket performance analyst working with a coach to review their squad's statistics.
You will receive structured player stats from Play-Cricket for a single season.
Your analysis must be grounded strictly in the data provided — do not invent statistics or make assumptions beyond what is given.
Note that this is match performance data only; you have no information about players' batting technique.
Respond ONLY with a valid JSON object, no markdown, no preamble.`;

function buildUserPrompt(
  season: string,
  competitionType: string | undefined,
  statsPayload: object
): string {
  return `Analyse the following squad statistics for the ${season} season${competitionType ? ` (${competitionType})` : ""}.

${JSON.stringify(statsPayload, null, 2)}

Return a JSON object with this exact shape:
{
  "summary": "2-3 sentence overview of the squad's overall performance this season",
  "improving": [
    { "name": "string", "reason": "string (cite specific stats)" }
  ],
  "declining": [
    { "name": "string", "reason": "string (cite specific stats)" }
  ],
  "standouts": [
    { "name": "string", "reason": "string", "category": "batting"|"bowling"|"allround"|"fielding" }
  ],
  "insights": [
    "string — each insight is a standalone observation, max 2 sentences"
  ],
  "dataNote": "string — note any limitations (e.g. small sample sizes, players with fewer than 3 innings)"
}

Keep all name references to first name + last name only. Maximum 3 entries per array. Be specific and cite numbers.`;
}

function extractJsonObject(rawText: string): string | null {
  const withoutFences = rawText.replace(/```json|```/gi, "").trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return withoutFences.slice(start, end + 1);
}

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

  const parsed = analyseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { clubId, season, competitionType } = parsed.data;

  const club = await prisma.club.findFirst({
    where: { id: clubId, coachId: authUser.id },
  });
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const statsWhere: Record<string, unknown> = {
    clubId,
    season,
  };
  if (competitionType) {
    statsWhere.competitionType = competitionType;
  }

  const statsRows = await prisma.playCricketPlayerStats.findMany({
    where: statsWhere,
    include: {
      import: {
        select: {
          firstName: true,
          lastName: true,
          linkedUserId: true,
        },
      },
    },
  });

  const byPlayer = new Map<
    string,
    { firstName: string; lastName: string; stats: typeof statsRows }
  >();
  for (const row of statsRows) {
    const key = row.playCricketPersonId;
    const existing = byPlayer.get(key);
    const player = {
      firstName: row.import.firstName,
      lastName: row.import.lastName,
      ...row.import,
    };
    if (existing) {
      existing.stats.push(row);
    } else {
      byPlayer.set(key, {
        firstName: player.firstName,
        lastName: player.lastName,
        stats: [row],
      });
    }
  }

  const players = Array.from(byPlayer.entries()).map(([personId, entry]) => {
    const s = entry.stats[0]!;
    return {
      playCricketPersonId: personId,
      firstName: entry.firstName,
      lastName: entry.lastName,
      teamName: s.teamName,
      season: s.season,
      competitionType: s.competitionType,
      batting: {
        innings: s.battingInnings,
        runs: s.battingRuns,
        average: s.battingAverage,
        highest: s.battingHighest,
        fifties: s.battingFifties,
        hundreds: s.battingHundreds,
        strikeRate: s.battingStrikeRate,
      },
      bowling: {
        wickets: s.bowlingWickets,
        average: s.bowlingAverage,
        economy: s.bowlingEconomy,
        bestFigures: s.bowlingBestFigures,
        fiveWickets: s.bowlingFiveWickets,
      },
      fielding: {
        catches: s.fieldingCatches,
        stumpings: s.fieldingStumpings,
        runOuts: s.fieldingRunOuts,
      },
    };
  });

  if (players.length < 2) {
    return NextResponse.json(
      { error: "Insufficient data: need at least 2 players" },
      { status: 400 }
    );
  }

  const linkedUserIds = [
    ...new Set(
      statsRows
        .map((r) => r.import.linkedUserId)
        .filter((id): id is string => id != null)
    ),
  ];

  const linkedAnalysesMap = new Map<
    string,
    Array<{
      gradeOverall: number | null;
      gradeLetter: string | null;
      scoreBacklift: number | null;
      scoreWeightTransfer: number | null;
      scoreHeadPosition: number | null;
      scoreFollowThrough: number | null;
      scoreTiming: number | null;
      scoreBalance: number | null;
      scoreFootwork: number | null;
      scoreShotSelection: number | null;
    }>
  >();

  if (linkedUserIds.length > 0) {
    const analyses = await prisma.analysis.findMany({
      where: {
        status: "COMPLETE",
        video: {
          userId: { in: linkedUserIds },
          isDeleted: false,
        },
      },
      select: {
        gradeOverall: true,
        gradeLetter: true,
        scoreBacklift: true,
        scoreWeightTransfer: true,
        scoreHeadPosition: true,
        scoreFollowThrough: true,
        scoreTiming: true,
        scoreBalance: true,
        scoreFootwork: true,
        scoreShotSelection: true,
        completedAt: true,
        video: { select: { userId: true } },
      },
      orderBy: { completedAt: "desc" },
      take: linkedUserIds.length * 10,
    });

    for (const a of analyses) {
      const uid = a.video.userId;
      if (!linkedAnalysesMap.has(uid)) linkedAnalysesMap.set(uid, []);
      linkedAnalysesMap.get(uid)!.push({
        gradeOverall: a.gradeOverall,
        gradeLetter: a.gradeLetter,
        scoreBacklift: a.scoreBacklift,
        scoreWeightTransfer: a.scoreWeightTransfer,
        scoreHeadPosition: a.scoreHeadPosition,
        scoreFollowThrough: a.scoreFollowThrough,
        scoreTiming: a.scoreTiming,
        scoreBalance: a.scoreBalance,
        scoreFootwork: a.scoreFootwork,
        scoreShotSelection: a.scoreShotSelection,
      });
    }
  }

  const personIdToLinkedUserId = new Map<string, string>();
  for (const row of statsRows) {
    if (row.import.linkedUserId) {
      personIdToLinkedUserId.set(row.playCricketPersonId, row.import.linkedUserId);
    }
  }

  function avg(values: (number | null)[]): number | null {
    const defined = values.filter((v): v is number => v != null);
    if (defined.length === 0) return null;
    return defined.reduce((a, b) => a + b, 0) / defined.length;
  }

  const crossRefLines: string[] = [];
  let crossReferenced = 0;
  for (const p of players) {
    const linkedUserId = personIdToLinkedUserId.get(p.playCricketPersonId);
    if (!linkedUserId) continue;
    const list = linkedAnalysesMap.get(linkedUserId);
    if (!list || list.length === 0) continue;
    crossReferenced++;
    const gradeOverall = avg(list.map((a) => a.gradeOverall));
    const gradeLetter = list.find((a) => a.gradeLetter)?.gradeLetter ?? "—";
    const scoreBacklift = avg(list.map((a) => a.scoreBacklift));
    const scoreTiming = avg(list.map((a) => a.scoreTiming));
    const scoreHeadPosition = avg(list.map((a) => a.scoreHeadPosition));
    const scoreFootwork = avg(list.map((a) => a.scoreFootwork));
    const scoreWeightTransfer = avg(list.map((a) => a.scoreWeightTransfer));
    const scoreFollowThrough = avg(list.map((a) => a.scoreFollowThrough));
    const playerName = `${p.firstName} ${p.lastName}`;
    crossRefLines.push(
      `${playerName} — Koda technique grade: ${gradeLetter} (${gradeOverall?.toFixed(1) ?? "—"}/10 overall)\n  Batting scores: Backlift ${scoreBacklift?.toFixed(1) ?? "—"}/10, Timing ${scoreTiming?.toFixed(1) ?? "—"}/10, Head Position ${scoreHeadPosition?.toFixed(1) ?? "—"}/10, Footwork ${scoreFootwork?.toFixed(1) ?? "—"}/10, Weight Transfer ${scoreWeightTransfer?.toFixed(1) ?? "—"}/10, Follow Through ${scoreFollowThrough?.toFixed(1) ?? "—"}/10\n  (Based on ${list.length} video analyses)`
    );
  }

  let userPrompt = buildUserPrompt(season, competitionType, { players });
  if (crossRefLines.length > 0) {
    userPrompt += `\n\nThe following players are also registered on Koda Cricket and have video analysis data available.\nUse this to cross-reference match performance with batting technique:\n\n${crossRefLines.join("\n\n")}\n\nWhere relevant, note whether a player's match performance is consistent with their technique grade, or where there is a gap between technical quality and match output.`;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 502 }
    );
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawText =
      textBlock?.type === "text" ? textBlock.text.trim() : "";
    const jsonPayload = extractJsonObject(rawText);
    if (!jsonPayload) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 502 }
      );
    }

    const parsedJson = JSON.parse(jsonPayload) as object;
    return NextResponse.json({
      ...parsedJson,
      crossReferenced,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[POST /api/coach/play-cricket/analyse] Anthropic call failed", e);
    return NextResponse.json(
      { error: "Analysis service unavailable" },
      { status: 502 }
    );
  }
}
