import { inngest } from "@/inngest/client";
import { prisma } from "@/prisma/client";
import { decryptApiKey } from "@/lib/encrypt";
import { playCricketClient } from "@/lib/play-cricket/client";

export const syncMatchDetailFunction = inngest.createFunction(
  {
    id: "sync-match-detail",
    name: "Sync Play-Cricket Match Detail",
    concurrency: { limit: 5 },
    rateLimit: {
      limit: 60,
      period: "1m",
    },
    retries: 3,
  },
  { event: "play-cricket/match.sync-requested" },
  async ({ event, step }) => {
    const { coachId, clubId, matchId, siteId, season } = event.data;

    const { apiToken } = await step.run("resolve-api-token", async () => {
      const user = await prisma.user.findUnique({
        where: { id: coachId },
        select: { ecbApiKeyEncrypted: true, ecbApiKeyIv: true, ecbApiKeyTag: true },
      });
      if (!user?.ecbApiKeyEncrypted || !user.ecbApiKeyIv || !user.ecbApiKeyTag) {
        throw new Error("no_api_key");
      }
      return {
        apiToken: decryptApiKey({
          ciphertext: user.ecbApiKeyEncrypted,
          iv: user.ecbApiKeyIv,
          tag: user.ecbApiKeyTag,
        }),
      };
    });

    await step.run("fetch-and-upsert-scorecard", async () => {
      const result = await playCricketClient.getMatchDetail(apiToken, matchId);
      if (!result.ok || !result.data) return;

      const detail = result.data as Record<string, unknown>;
      const rawPayload = detail;

      const matchDate = detail.match_date
        ? new Date(String(detail.match_date))
        : null;
      const homeTeamId = detail.home_team_id != null ? String(detail.home_team_id) : null;
      const awayTeamId = detail.away_team_id != null ? String(detail.away_team_id) : null;
      const homeTeamName =
        typeof detail.home_team_name === "string" ? detail.home_team_name : null;
      const awayTeamName =
        typeof detail.away_team_name === "string" ? detail.away_team_name : null;
      const resultDesc =
        typeof detail.result_description === "string"
          ? detail.result_description
          : null;
      const compType =
        typeof detail.competition_type === "string"
          ? detail.competition_type
          : null;

      const matchRecord = await prisma.playCricketMatch.upsert({
        where: { playCricketMatchId: Number(matchId) },
        create: {
          coachId,
          clubId,
          playCricketMatchId: Number(matchId),
          matchDate,
          homeTeamId,
          awayTeamId,
          homeTeamName,
          awayTeamName,
          resultDescription: resultDesc,
          competitionType: compType,
          season,
          rawPayload: rawPayload as object,
        },
        update: {
          matchDate,
          homeTeamId,
          awayTeamId,
          homeTeamName,
          awayTeamName,
          resultDescription: resultDesc,
          competitionType: compType,
          rawPayload: rawPayload as object,
          updatedAt: new Date(),
        },
      });

      // TODO: verify field names against live API response — innings array shape may vary
      const innings = Array.isArray(detail.innings) ? detail.innings : [];
      for (let i = 0; i < innings.length; i++) {
        const inn = innings[i] as Record<string, unknown>;
        const innNum = i + 1;
        const bat = Array.isArray(inn.bat) ? inn.bat : Array.isArray(inn.batting) ? inn.batting : [];
        const bowl = Array.isArray(inn.bowl) ? inn.bowl : Array.isArray(inn.bowling) ? inn.bowling : [];

        const seenPersonIds = new Set<string>();
        for (const row of bat) {
          const r = row as Record<string, unknown>;
          const personId = r.member_id != null ? String(r.member_id) : r.person_id != null ? String(r.person_id) : null;
          if (!personId || seenPersonIds.has(personId)) continue;
          seenPersonIds.add(personId);

          const battingRuns = r.runs != null ? Number(r.runs) : null;
          const battingBalls = r.balls != null ? Number(r.balls) : null;
          const battingFours = r.fours != null ? Number(r.fours) : null;
          const battingSixes = r.sixes != null ? Number(r.sixes) : null;
          const battingDismissal =
            typeof r.dismissal === "string" ? r.dismissal : null;
          const battingPosition = r.position != null ? Number(r.position) : null;

          await prisma.playCricketMatchInning.upsert({
            where: {
              matchId_playCricketPersonId_inningsNumber: {
                matchId: matchRecord.id,
                playCricketPersonId: personId,
                inningsNumber: innNum,
              },
            },
            create: {
              matchId: matchRecord.id,
              playCricketPersonId: personId,
              inningsNumber: innNum,
              battingPosition,
              battingRuns,
              battingBalls,
              battingFours,
              battingSixes,
              battingDismissal,
            },
            update: {
              battingPosition,
              battingRuns,
              battingBalls,
              battingFours,
              battingSixes,
              battingDismissal,
            },
          });
        }

        for (const row of bowl) {
          const r = row as Record<string, unknown>;
          const personId = r.member_id != null ? String(r.member_id) : r.person_id != null ? String(r.person_id) : null;
          if (!personId) continue;

          const bowlingOvers = r.overs != null ? Number(r.overs) : null;
          const bowlingMaidens = r.maidens != null ? Number(r.maidens) : null;
          const bowlingRuns = r.runs != null ? Number(r.runs) : null;
          const bowlingWickets = r.wickets != null ? Number(r.wickets) : null;

          await prisma.playCricketMatchInning.upsert({
            where: {
              matchId_playCricketPersonId_inningsNumber: {
                matchId: matchRecord.id,
                playCricketPersonId: personId,
                inningsNumber: innNum,
              },
            },
            create: {
              matchId: matchRecord.id,
              playCricketPersonId: personId,
              inningsNumber: innNum,
              bowlingOvers,
              bowlingMaidens,
              bowlingRuns,
              bowlingWickets,
            },
            update: {
              bowlingOvers,
              bowlingMaidens,
              bowlingRuns,
              bowlingWickets,
            },
          });
        }
      }
    });
  }
);
