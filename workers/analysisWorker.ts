import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { prisma } from "@/prisma/client";
import { calculateGrade } from "@/src/lib/grading";

interface AnalysisJobData {
  videoId: string;
  userId: string;
  analysisId: string;
}

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
const redisPublisher = new Redis(connection.url);

async function publishStage(analysisId: string, payload: Record<string, unknown>): Promise<void> {
  await redisPublisher.publish(`analysis:${analysisId}`, JSON.stringify(payload));
}

export const analysisWorker = new Worker<AnalysisJobData>(
  "analysis",
  async (job: Job<AnalysisJobData>) => {
    const { analysisId, videoId } = job.data;

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
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "SHOT_CLASSIFICATION", shotType: "COVER_DRIVE", shotConfidence: 0.84 },
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

    const metricScores = [78, 81, 74, 77, 80, 79, 75, 76];
    const grade = calculateGrade("COVER_DRIVE", metricScores);

    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "COMPLETE",
        gradeOverall: grade.score,
        gradeLetter: grade.letter,
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
  },
  { connection, concurrency: 2 }
);
