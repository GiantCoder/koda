import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { prisma } from "@/prisma/client";
import { calculateGrade } from "@/src/lib/grading";
import { classifyShotWithGemini, scoreBiomechanicsWithGemini } from "@/src/lib/llm/gemini";
import { runGamificationPipeline } from "@/lib/gamification/run-pipeline";
import { shouldAwardPointsForShadowBatting, shouldAwardPointsForUploads } from "@/lib/gamification/settings";
import { downloadFromStorage, uploadToStorage } from "@/src/lib/storage";
import {
  extractFramesAsJpegBase64,
  removeTempPath,
  writeTempVideoFile,
} from "@/src/lib/analysis/video-frames";
import {
  estimatePoseFromFrames,
  MEDIAPIPE_FRAMES_PER_BATCH,
} from "@/src/lib/analysis/mediapipe-client";
import { logMediaPipeOutcome, logPoseSummaryForLlm } from "@/src/lib/analysis/pipeline-log";
import { buildPoseSummaryForLlm } from "@/src/lib/analysis/pose-summary";
import { buildCoachingFeedbackFromScores, shotTypeToLabel } from "@/src/lib/analysis/coaching-feedback";
import type { PoseEstimateResponse } from "@/src/lib/analysis/mediapipe-types";

function jsonToStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    out.push(item);
  }
  return out;
}

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
    const { analysisId, videoId, userId } = job.data;
    const pipelineStart = Date.now();
    let tempPath: string | null = null;
    let poseSummary: string | null = null;
    let posePayload: PoseEstimateResponse | null = null;
    let mediapipeWarning: string | null = null;

    const row = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        video: {
          select: {
            storagePath: true,
            originalFormat: true,
            filename: true,
            durationSeconds: true,
            resolutionWidth: true,
            resolutionHeight: true,
          },
        },
      },
    });

    if (!row || row.videoId !== videoId) {
      throw new Error("Analysis not found");
    }

    const declared = row.playerDeclaredShotType;
    const declaredShotCount = row.declaredShotCount;
    const declaredHints =
      declaredShotCount != null ? jsonToStringArray(row.playerDeclaredShotHints) : null;

    try {
      await prisma.analysis.update({
        where: { id: analysisId },
        data: { status: "EXTRACTING_FRAMES", startedAt: new Date(), errorMessage: null },
      });
      await publishStage(analysisId, {
        stage: "EXTRACTING_FRAMES",
        progress: 15,
        message: "Extracting key frames...",
      });

      const buffer = await downloadFromStorage(row.video.storagePath);
      const ext = (row.video.originalFormat || "mp4").replace(/[^a-z0-9]/gi, "") || "mp4";
      tempPath = await writeTempVideoFile(buffer, ext);

      const { framesBase64, sampleFps, width, height } = await extractFramesAsJpegBase64(tempPath, {
        targetFps: 5,
        maxFrames: 40,
        scaleWidth: 480,
      });

      if (framesBase64.length === 0) {
        throw new Error("No frames extracted from video — check format and FFmpeg install");
      }

      console.log(
        `[analysisWorker] ${analysisId}: extracted ${framesBase64.length} frames @${sampleFps}fps ${width}x${height}`
      );

      await prisma.analysis.update({
        where: { id: analysisId },
        data: { status: "POSE_ANALYSIS" },
      });
      await publishStage(analysisId, {
        stage: "POSE_ANALYSIS",
        progress: 40,
        message: "Sending frames to MediaPipe...",
      });

      try {
        const batchCount = Math.max(1, Math.ceil(framesBase64.length / MEDIAPIPE_FRAMES_PER_BATCH));
        posePayload = await estimatePoseFromFrames({
          framesBase64,
          width,
          height,
          fps: sampleFps,
          analysisId,
        });
        poseSummary = buildPoseSummaryForLlm(posePayload);
        logMediaPipeOutcome(analysisId, posePayload, {
          framesSentToService: framesBase64.length,
          videoMeta: { width, height, fps: sampleFps },
          batchCount,
        });
        logPoseSummaryForLlm(analysisId, poseSummary);

        const poseJson = Buffer.from(JSON.stringify(posePayload), "utf8");
        const poseKey = `pose-data/${analysisId}/pose.json`;
        await uploadToStorage(poseKey, poseJson, "application/json");
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { poseDataPath: poseKey },
        });
        console.log(
          `[analysisWorker] ${analysisId}: MediaPipe ok, ${posePayload.landmarks.length} landmark frames, ${posePayload.processingMs}ms`
        );
      } catch (mpErr) {
        mediapipeWarning =
          mpErr instanceof Error ? mpErr.message : "MediaPipe pose estimation failed";
        console.warn(`[analysisWorker] ${analysisId}: MediaPipe fallback:`, mediapipeWarning);
        logPoseSummaryForLlm(analysisId, null);
      }
      if (tempPath) {
        await removeTempPath(tempPath);
        tempPath = null;
      }

      await prisma.analysis.update({
        where: { id: analysisId },
        data: { status: "SHOT_CLASSIFICATION" },
      });
      await publishStage(analysisId, {
        stage: "SHOT_CLASSIFICATION",
        progress: 62,
        message: "Classifying shot with Gemini...",
      });

      const classification = await classifyShotWithGemini({
        videoId,
        filename: row.video.filename,
        durationSeconds: row.video.durationSeconds,
        resolutionWidth: row.video.resolutionWidth,
        resolutionHeight: row.video.resolutionHeight,
        poseSummary,
        playerDeclaredShotType: declared,
        declaredShotCount,
        playerDeclaredShotHints: declaredHints,
        analysisId,
      });

      await prisma.analysis.update({
        where: { id: analysisId },
        data: { status: "GENERATING_FEEDBACK" },
      });
      await publishStage(analysisId, {
        stage: "GENERATING_FEEDBACK",
        progress: 80,
        message: "Scoring biomechanics...",
      });

      const scoring = await scoreBiomechanicsWithGemini({
        shotType: classification.shotType,
        shotTypesOrdered: classification.shotTypesOrdered,
        declaredShotCount,
        durationSeconds: row.video.durationSeconds,
        poseSummary,
        analysisId,
      });

      const metricScores = scoring.scores;
      const grade = calculateGrade(classification.shotType, metricScores);
      const label = shotTypeToLabel(classification.shotType);
      const coachingFeedback = buildCoachingFeedbackFromScores(label, {
        weightTransfer: metricScores[1] ?? 75,
        balance: metricScores[5] ?? 75,
        timing: metricScores[4] ?? 75,
      });

      const geminiRawResponse = {
        classification: {
          text: classification.rawResponseText,
          shotType: classification.shotType,
          shotTypesOrdered: classification.shotTypesOrdered,
          confidence: classification.confidence,
          reasons: classification.reasons,
        },
        scoring: {
          text: scoring.rawResponseText,
          scores: scoring.scores,
        },
        mediapipe: posePayload
          ? {
              frames: posePayload.landmarks.length,
              processingMs: posePayload.processingMs,
            }
          : null,
        mediapipeWarning,
      };

      const processingMs = Date.now() - pipelineStart;

      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: "COMPLETE",
          shotType: classification.shotType as any,
          shotConfidence: classification.confidence,
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
              type: "summary",
              title: `${grade.letter} — ${label}`,
              description: coachingFeedback,
            },
          ],
          rawGeminiResponse: geminiRawResponse as any,
          processingMs,
          completedAt: new Date(),
        },
      });

      await publishStage(analysisId, {
        type: "complete",
        analysisId,
        videoId,
        redirectUrl: `/analysis/${videoId}`,
      });

      const analysis = await prisma.analysis.findUniqueOrThrow({
        where: { id: analysisId },
        include: { video: { select: { storagePath: true } } },
      });

      const videoPath = analysis.video.storagePath;
      const isShadowBatting =
        videoPath.startsWith("shadow-batting/") || videoPath.includes("/shadow-batting/");

      if (isShadowBatting) {
        if (await shouldAwardPointsForShadowBatting()) {
          await runGamificationPipeline(userId, analysis);
        }
      } else if (await shouldAwardPointsForUploads()) {
        await runGamificationPipeline(userId, analysis);
      }

      console.log(`[analysisWorker] ${analysisId}: COMPLETE in ${processingMs}ms`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed";
      console.error(`[analysisWorker] ${analysisId}: FAILED`, error);
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: "FAILED",
          errorMessage: message,
        },
      });
      await publishStage(analysisId, {
        type: "error",
        message,
        code: "ANALYSIS_FAILED",
      });
      throw error;
    } finally {
      if (tempPath) {
        await removeTempPath(tempPath);
      }
    }
  },
  { connection, concurrency: 2 }
);
