import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { prisma } from "@/prisma/client";
import { calculateGrade } from "@/src/lib/grading";
import { classifyShotWithGemini, scoreBiomechanicsWithGemini } from "@/src/lib/llm/gemini";
import { classifyActivityWithGemini } from "@/src/lib/llm/activityClassification";
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
import { buildPoseSummaryForLlm, assessPoseTrackingSubject, extractBatterFramesFromMixedPose, remapPoseFromFarEndRoi, looksLikeDistantBatter } from "@/src/lib/analysis/pose-summary";
import { cropFramesToFarEndBatterRoi, FAR_END_BATTER_ROI_ATTEMPTS, maskForegroundSubjectInFrames } from "@/src/lib/analysis/frame-crop";
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

const SHOT_CONFIDENCE_THRESHOLD = 0.5;

function buildRejectionReason(activityType: string, reasons: string[]): string {
  const activity =
    activityType === "BOWLING"
      ? "bowling-only practice with no batter visible"
      : activityType === "FIELDING"
        ? "fielding"
        : activityType === "GYM"
          ? "gym or fitness work"
          : "non-batting activity";
  const baseMessage = `This video appears to show ${activity}, not batting technique.`;
  const detail = reasons[0] ? ` ${reasons[0]}` : "";
  return `${baseMessage}${detail} Please upload a video of a batting shot or practice.`;
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
    let poseTracksForegroundBowlersRunUp = false;
    /** True when MediaPipe was re-run on the far-end crop and remapped to full-frame coords. */
    let farEndBatterPoseRecovered = false;
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
        targetFps: 8,
        maxFrames: 56,
        scaleWidth: 640,
      });

      if (framesBase64.length === 0) {
        throw new Error("No frames extracted from video — check format and FFmpeg install");
      }

      console.log(
        `[analysisWorker] ${analysisId}: extracted ${framesBase64.length} frames @${sampleFps}fps ${width}x${height}`
      );

      // ── ACTIVITY GATE ──────────────────────────────────────────────────────
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: "ACTIVITY_CLASSIFICATION",
        } as Parameters<typeof prisma.analysis.update>[0]["data"],
      });
      await publishStage(analysisId, {
        stage: "ACTIVITY_CLASSIFICATION",
        progress: 25,
        message: "Checking video content...",
      });

      const activityResult = await classifyActivityWithGemini({
        framesBase64,
        analysisId,
        filename: row.video.filename,
      });

      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          activityType: activityResult.activityType,
          activityConfidence: activityResult.confidence,
        } as Parameters<typeof prisma.analysis.update>[0]["data"],
      });

      if (!activityResult.isBatting) {
        const rejectionReason = buildRejectionReason(
          activityResult.activityType,
          activityResult.reasons
        );
        await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            status: "UNSUPPORTED_CONTENT",
            rejectionReason,
            completedAt: new Date(),
          } as Parameters<typeof prisma.analysis.update>[0]["data"],
        });
        await publishStage(analysisId, {
          type: "unsupported",
          activityType: activityResult.activityType,
          confidence: activityResult.confidence,
          rejectionReason,
          redirectUrl: `/analysis/${videoId}`,
        });
        console.log(
          `[analysisWorker] ${analysisId}: UNSUPPORTED_CONTENT — ${activityResult.activityType} (confidence ${activityResult.confidence})`
        );
        return;
      }
      // ── END ACTIVITY GATE ──────────────────────────────────────────────────

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
        const poseSubject = assessPoseTrackingSubject(posePayload, { frameHeight: height });
        poseTracksForegroundBowlersRunUp = poseSubject.likelyForegroundBowlersRunUp;

        if (poseSubject.likelyForegroundBowlersRunUp) {
          // Prefer masking the detected foreground subject, then fall back to far-end ROI crops.
          const originalPose = posePayload;
          let batterPoseRecovered = false;
          const cropAttempts: Array<Record<string, unknown>> = [];

          const tryAcceptRemapped = (
            remapped: PoseEstimateResponse,
            meta: Record<string, unknown>
          ): boolean => {
            const accepted = looksLikeDistantBatter(remapped, { frameHeight: height });
            const remappedSubject = assessPoseTrackingSubject(remapped, {
              frameHeight: height,
            });
            cropAttempts.push({
              ...meta,
              landmarks: remapped.landmarks.length,
              accepted,
              meanNoseY: remappedSubject.meanNoseY,
              meanBodyHeightFrac: remappedSubject.meanBodyHeightFrac,
              bbox: remapped.batsman_bbox ?? null,
            });
            if (!accepted) return false;
            posePayload = remapped;
            poseSummary = buildPoseSummaryForLlm(remapped);
            batterPoseRecovered = true;
            farEndBatterPoseRecovered = true;
            console.log(
              JSON.stringify(
                {
                  tag: "analysisPipeline.poseSubject",
                  analysisId,
                  likelyForegroundBowlersRunUp: true,
                  noseXSpan: poseSubject.noseXSpan,
                  meanBodyHeightFrac: poseSubject.meanBodyHeightFrac,
                  meanNoseY: poseSubject.meanNoseY,
                  reason: poseSubject.reason,
                  farEndRepose: true,
                  ...meta,
                  batterFramesRecovered: remapped.landmarks.length,
                  remappedMeanBodyHeightFrac: remappedSubject.meanBodyHeightFrac,
                  remappedMeanNoseY: remappedSubject.meanNoseY,
                  cropAttempts,
                  totalFrames: framesBase64.length,
                },
                null,
                2
              )
            );
            return true;
          };

          // 1) Mask left/foreground bbox so MediaPipe cannot lock onto the coach.
          const fgBox = originalPose.batsman_bbox;
          if (
            fgBox &&
            typeof fgBox.x === "number" &&
            typeof fgBox.y === "number" &&
            typeof fgBox.w === "number" &&
            typeof fgBox.h === "number"
          ) {
            try {
              const maskedFrames = await maskForegroundSubjectInFrames(
                framesBase64,
                { x: fgBox.x, y: fgBox.y, w: fgBox.w, h: fgBox.h },
                width,
                height
              );
              const maskedPose = await estimatePoseFromFrames({
                framesBase64: maskedFrames,
                width,
                height,
                fps: sampleFps,
                analysisId,
              });
              if (maskedPose.landmarks.length >= 3) {
                tryAcceptRemapped(maskedPose, {
                  strategy: "mask_foreground_bbox",
                  maskBbox: fgBox,
                });
              } else {
                cropAttempts.push({
                  strategy: "mask_foreground_bbox",
                  accepted: false,
                  reason: "too_few_landmarks",
                  landmarks: maskedPose.landmarks.length,
                });
              }
            } catch (maskErr) {
              cropAttempts.push({
                strategy: "mask_foreground_bbox",
                accepted: false,
                reason: maskErr instanceof Error ? maskErr.message : String(maskErr),
              });
              console.warn(
                `[analysisWorker] ${analysisId}: foreground mask re-pose failed:`,
                maskErr instanceof Error ? maskErr.message : maskErr
              );
            }
          }

          // 2) Fall back to far-end ROI crops if masking did not yield a distant batter.
          if (!batterPoseRecovered) {
            for (const roi of FAR_END_BATTER_ROI_ATTEMPTS) {
              try {
                const farEndFrames = await cropFramesToFarEndBatterRoi(framesBase64, roi);
                const croppedPose = await estimatePoseFromFrames({
                  framesBase64: farEndFrames,
                  width: Math.max(
                    1,
                    Math.floor(width * (1 - roi.leftTrimFraction - roi.rightTrimFraction))
                  ),
                  height: Math.max(1, Math.floor(height * roi.heightFraction)),
                  fps: sampleFps,
                  analysisId,
                });
                if (croppedPose.landmarks.length < 3) {
                  cropAttempts.push({
                    strategy: "far_end_roi",
                    ...roi,
                    landmarks: croppedPose.landmarks.length,
                    accepted: false,
                    reason: "too_few_landmarks",
                  });
                  continue;
                }
                const remapped = remapPoseFromFarEndRoi(croppedPose, {
                  ...roi,
                  fullFrameWidth: width,
                  fullFrameHeight: height,
                });
                if (
                  tryAcceptRemapped(remapped, {
                    strategy: "far_end_roi",
                    cropRoi: roi,
                  })
                ) {
                  break;
                }
              } catch (farEndErr) {
                cropAttempts.push({
                  strategy: "far_end_roi",
                  ...roi,
                  accepted: false,
                  reason: farEndErr instanceof Error ? farEndErr.message : String(farEndErr),
                });
                console.warn(
                  `[analysisWorker] ${analysisId}: far-end re-pose attempt failed:`,
                  farEndErr instanceof Error ? farEndErr.message : farEndErr
                );
              }
            }
          }

          if (!batterPoseRecovered) {
            // Do NOT keep coach/bowler landmarks for overlay OR for the LLM.
            // Mixed-pose "batter frame" extraction still mostly tracks the coach on this camera;
            // feeding it as pose cues causes LEAVE/FORWARD_DEFENCE confusion and false front_foot_fwd.
            const batterOnlyPose = extractBatterFramesFromMixedPose(originalPose);
            posePayload = {
              landmarks: [],
              batsman_bbox: null,
              processingMs: originalPose.processingMs,
            };
            poseSummary = null;
            console.log(
              JSON.stringify(
                {
                  tag: "analysisPipeline.poseSubject",
                  analysisId,
                  likelyForegroundBowlersRunUp: true,
                  noseXSpan: poseSubject.noseXSpan,
                  meanBodyHeightFrac: poseSubject.meanBodyHeightFrac,
                  meanNoseY: poseSubject.meanNoseY,
                  reason: poseSubject.reason,
                  farEndRepose: false,
                  batterFramesRecovered: batterOnlyPose?.landmarks.length ?? 0,
                  cropAttempts,
                  overlayPoseCleared: true,
                  poseSummaryCleared: true,
                  totalFrames: framesBase64.length,
                },
                null,
                2
              )
            );
          }
        } else {
          poseSummary = buildPoseSummaryForLlm(posePayload);
          console.log(
            JSON.stringify(
              {
                tag: "analysisPipeline.poseSubject",
                analysisId,
                likelyForegroundBowlersRunUp: false,
                noseXSpan: poseSubject.noseXSpan,
                meanBodyHeightFrac: poseSubject.meanBodyHeightFrac,
              },
              null,
              2
            )
          );
        }
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
        poseTracksForegroundBowlersRunUp,
        framesBase64,
        playerDeclaredShotType: declared,
        declaredShotCount,
        playerDeclaredShotHints: declaredHints,
        analysisId,
      });

      if (
        classification.noBatsman ||
        classification.shotType === "UNKNOWN" ||
        classification.confidence < SHOT_CONFIDENCE_THRESHOLD
      ) {
        const noGradeReason = classification.noBatsman
          ? "No batsman was visible in the video during shot classification."
          : classification.shotType === "UNKNOWN"
            ? "The shot type could not be determined from the available footage."
            : `Shot classification confidence was too low (${Math.round(classification.confidence * 100)}%) to produce a reliable grade.`;

        await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            status: "UNSUPPORTED_CONTENT",
            shotType: "UNKNOWN" as any,
            shotConfidence: classification.confidence,
            rejectionReason: noGradeReason,
            rawGeminiResponse: {
              classification: {
                text: classification.rawResponseText,
                shotType: classification.shotType,
                confidence: classification.confidence,
                noBatsman: classification.noBatsman,
                reasons: classification.reasons,
              },
              activityGate: {
                activityType: activityResult.activityType,
                confidence: activityResult.confidence,
              },
            } as any,
            completedAt: new Date(),
          } as Parameters<typeof prisma.analysis.update>[0]["data"],
        });
        await publishStage(analysisId, {
          type: "unsupported",
          rejectionReason: noGradeReason,
          redirectUrl: `/analysis/${videoId}`,
        });
        console.log(
          `[analysisWorker] ${analysisId}: UNSUPPORTED_CONTENT (low-confidence classification) — ${noGradeReason}`
        );
        return;
      }

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
        // Far-end re-pose yields real batter landmarks — treat as reliable for scoring.
        poseTracksForegroundBowlersRunUp:
          poseTracksForegroundBowlersRunUp && !farEndBatterPoseRecovered,
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
