import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { prisma } from "@/prisma/client";
import { calculateGrade } from "@/src/lib/grading";
import { classifyShotWithGemini, scoreBiomechanicsWithGemini } from "@/src/lib/llm/gemini";
import { awardAnalysisPoints } from "@/lib/gamification/points";
import { checkAndAwardBadges } from "@/lib/gamification/badges";
import { updateLeagueEntriesForUser } from "@/lib/gamification/leagues";
import { updatePlayerCardFromAnalyses } from "@/lib/gamification/card-update";
import { sendGamificationNotifications } from "@/lib/gamification/notifications";

interface AnalysisJobData {
  videoId: string;
  userId: string;
  analysisId: string;
}

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
const redisPublisher = new Redis(connection.url, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  lazyConnect: false,
});

redisPublisher.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redisPublisher.on("connect", () => {
  console.log("Redis publisher connected");
});

async function publishStage(analysisId: string, payload: Record<string, unknown>): Promise<void> {
  await redisPublisher.publish(`analysis:${analysisId}`, JSON.stringify(payload));
}

export const analysisWorker = new Worker<AnalysisJobData>(
  "analysis",
  async (job: Job<AnalysisJobData>) => {
    const { analysisId, videoId } = job.data;
    let geminiRawResponse: Record<string, unknown> | null = null;

    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "EXTRACTING_FRAMES", startedAt: new Date(), errorMessage: null },
    });
    await publishStage(analysisId, {
      stage: "EXTRACTING_FRAMES",
      progress: 15,
      message: "Extracting key frames...",
    });

    // MVP fallback for pipeline stages; replace with FFmpeg + MediaPipe + LLM calls.
    await new Promise((resolve) => setTimeout(resolve, 250));
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "POSE_ANALYSIS" },
    });
    await publishStage(analysisId, {
      stage: "POSE_ANALYSIS",
      progress: 45,
      message: "Analysing body position...",
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        filename: true,
        durationSeconds: true,
        resolutionWidth: true,
        resolutionHeight: true,
      },
    });

    const fallbackShotType = "COVER_DRIVE";
    const fallbackShotConfidence = 0.84;
    const fallbackScores = [78, 81, 74, 77, 80, 79, 75, 76];

    let detectedShotType = fallbackShotType;
    let detectedShotConfidence = fallbackShotConfidence;
    let metricScores = fallbackScores;

    try {
      const classification = await classifyShotWithGemini({
        videoId,
        filename: video?.filename ?? "unknown",
        durationSeconds: video?.durationSeconds,
        resolutionWidth: video?.resolutionWidth,
        resolutionHeight: video?.resolutionHeight,
      });

      const scoring = await scoreBiomechanicsWithGemini({
        shotType: classification.shotType,
        durationSeconds: video?.durationSeconds,
      });

      detectedShotType = classification.shotType;
      detectedShotConfidence = classification.confidence;
      metricScores = scoring.scores;
      geminiRawResponse = {
        classification: {
          text: classification.rawResponseText,
          shotType: classification.shotType,
          confidence: classification.confidence,
          reasons: classification.reasons,
        },
        scoring: {
          text: scoring.rawResponseText,
          scores: scoring.scores,
        },
      };
    } catch (error) {
      geminiRawResponse = {
        error:
          error instanceof Error
            ? error.message
            : "Gemini call failed, using fallback analysis values",
      };
    }

    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "SHOT_CLASSIFICATION",
        shotType: detectedShotType as any,
        shotConfidence: detectedShotConfidence,
        rawGeminiResponse: geminiRawResponse as any,
      },
    });
    await publishStage(analysisId, {
      stage: "SHOT_CLASSIFICATION",
      progress: 70,
      message: "Classifying shot type...",
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "GENERATING_FEEDBACK" },
    });
    await publishStage(analysisId, {
      stage: "GENERATING_FEEDBACK",
      progress: 85,
      message: "Generating coaching feedback...",
    });

    const grade = calculateGrade(detectedShotType, metricScores);

    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "COMPLETE",
        gradeOverall: grade.score,
        gradeLetter: grade.letter,
        shotType: detectedShotType as any,
        shotConfidence: detectedShotConfidence,
        scoreBacklift: metricScores[0],
        scoreWeightTransfer: metricScores[1],
        scoreHeadPosition: metricScores[2],
        scoreFollowThrough: metricScores[3],
        scoreTiming: metricScores[4],
        scoreBalance: metricScores[5],
        scoreFootwork: metricScores[6],
        scoreShotSelection: metricScores[7],
        coachingTips: [
          {
            type: "strength",
            title: "Strong weight transfer",
            description: "You move through the shot well with stable momentum.",
          },
          {
            type: "improvement",
            title: "Earlier front-foot plant",
            description: "Plant your front foot slightly earlier for better balance at impact.",
          },
        ],
        completedAt: new Date(),
      },
    });

    await publishStage(analysisId, {
      type: "complete",
      analysisId,
      videoId,
      redirectUrl: `/analysis/${videoId}`,
    });

    // Gamification pipeline: points → badges → league → card update → notifications (non-fatal)
    try {
      const userId = job.data.userId;
      const analysis = await prisma.analysis.findUniqueOrThrow({
        where: { id: analysisId },
      });
      const transactions = await awardAnalysisPoints(userId, {
        id: analysis.id,
        gradeOverall: analysis.gradeOverall,
      });
      const totalAwarded = transactions.reduce((sum, t) => sum + t.points, 0);
      const newBadges = await checkAndAwardBadges(userId, analysis);
      await updateLeagueEntriesForUser(userId, totalAwarded, {
        gradeOverall: analysis.gradeOverall,
      });
      const cardResult = await updatePlayerCardFromAnalyses(userId);
      const tierChange =
        cardResult?.tierChanged && cardResult.previousTier != null
          ? { from: cardResult.previousTier, to: cardResult.newTier }
          : undefined;
      await sendGamificationNotifications(userId, {
        pointsAwarded: totalAwarded,
        newBadges,
        tierChange,
        cardUpdated: cardResult?.cardUpdated ? { newTier: cardResult.newTier } : undefined,
      });
    } catch (err) {
      console.error("[Gamification] Pipeline error (non-fatal):", err);
    }
  },
  { connection, concurrency: 2 }
);
