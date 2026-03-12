import { inngest } from "@/inngest/client";
import { prisma } from "@/prisma/client";
import { decryptApiKey } from "@/lib/encrypt";
import { playCricketClient } from "@/lib/play-cricket/client";
import type { PlayCricketPlayerSummary, PlayCricketTeam } from "@/lib/play-cricket/types";

export const syncClubStatsFunction = inngest.createFunction(
  {
    id: "sync-club-stats",
    name: "Sync Play-Cricket Club Stats",
    concurrency: { limit: 3 },
    rateLimit: {
      limit: 10,
      period: "1m",
    },
    retries: 2,
  },
  { event: "play-cricket/sync.requested" },
  async ({ event, step }) => {
    const { coachId, clubId, season } = event.data;

    const { apiToken, club } = await step.run("resolve-credentials", async () => {
      const [user, club] = await Promise.all([
        prisma.user.findUnique({
          where: { id: coachId },
          select: { ecbApiKeyEncrypted: true, ecbApiKeyIv: true, ecbApiKeyTag: true },
        }),
        prisma.club.findFirst({ where: { id: clubId, coachId } }),
      ]);

      if (!user?.ecbApiKeyEncrypted || !user.ecbApiKeyIv || !user.ecbApiKeyTag) {
        throw new Error("no_api_key");
      }
      if (!club) throw new Error("club_not_found");

      const apiToken = decryptApiKey({
        ciphertext: user.ecbApiKeyEncrypted,
        iv: user.ecbApiKeyIv,
        tag: user.ecbApiKeyTag,
      });

      return { apiToken, club };
    });

    const teams = await step.run("fetch-teams", async () => {
      const result = await playCricketClient.getTeams(apiToken, club.playCricketId);
      if (!result.ok) throw new Error(result.error.message);
      return result.data as PlayCricketTeam[];
    });

    const playerStats = await step.run("fetch-player-stats", async () => {
      const result = await playCricketClient.getPlayerStats(
        apiToken,
        club.playCricketId,
        season
      );
      if (!result.ok) throw new Error(result.error.message);
      return result.data as PlayCricketPlayerSummary[];
    });

    const { playersUpserted, statsRowsUpserted } = await step.run(
      "upsert-player-records",
      async () => {
        const personMap = new Map<
          string,
          { teamId: number; teamName: string; stats: PlayCricketPlayerSummary[] }
        >();
        for (const p of playerStats) {
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

        let playersUpserted = 0;
        let statsRowsUpserted = 0;

        for (const [personId, entry] of personMap) {
          const { teamName, stats: statsForPerson } = entry;
          const first = statsForPerson[0]!;
          const rawPayload = first as unknown as Record<string, unknown>;

          await prisma.playCricketImport.upsert({
            where: {
              coachId_playCricketPersonId: {
                coachId,
                playCricketPersonId: personId,
              },
            },
            create: {
              coachId,
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

          const importRecord = await prisma.playCricketImport.findUnique({
            where: {
              coachId_playCricketPersonId: { coachId, playCricketPersonId: personId },
            },
          });
          if (!importRecord) continue;

          for (const s of statsForPerson) {
            const compType = (s.competition_type ?? "Limited Overs") as string;
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
                coachId,
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

        return { playersUpserted, statsRowsUpserted };
      }
    );

    const matchCount = await step.run("fan-out-match-syncs", async () => {
      const result = await playCricketClient.getResultSummary(
        apiToken,
        club.playCricketId,
        season
      );
      if (!result.ok) return 0;

      const events = result.data.map((match) => ({
        name: "play-cricket/match.sync-requested" as const,
        data: {
          coachId,
          clubId,
          matchId: match.id,
          siteId: club.playCricketId,
          season,
          teamId: String((match as { home_team_id?: number }).home_team_id ?? ""),
        },
      }));

      if (events.length > 0) {
        await inngest.send(events);
      }
      return events.length;
    });

    await step.run("record-sync-log", async () => {
      await prisma.playCricketSyncLog.create({
        data: {
          coachId,
          clubId,
          season,
          status: "COMPLETE",
          playersUpserted,
          statsRowsUpserted,
          matchesSynced: matchCount,
          completedAt: new Date(),
        },
      });
    });

    return { playersUpserted, statsRowsUpserted, matchCount };
  }
);
