import { calculateBowlingGrade } from "@/src/lib/grading";
import { classifyBowlingActionWithGemini } from "@/src/lib/llm/bowlingClassification";
import { scoreBowlingBiomechanicsWithGemini } from "@/src/lib/llm/bowlingScoring";
import { formatDeliveryType } from "@/src/lib/cricket/bowling-types";
import {
  estimatePoseFromFrames,
  MEDIAPIPE_FRAMES_PER_BATCH,
} from "@/src/lib/analysis/mediapipe-client";
import { logMediaPipeOutcome, logPoseSummaryForLlm } from "@/src/lib/analysis/pipeline-log";
import { buildPoseSummaryForLlm } from "@/src/lib/analysis/pose-summary";
import { uploadToStorage } from "@/src/lib/storage";
import { removeTempPath } from "@/src/lib/analysis/video-frames";
import type { PoseEstimateResponse } from "@/src/lib/analysis/mediapipe-types";
import type { ActivityClassificationResult } from "@/src/lib/llm/activityClassification";

const BOWLING_CONFIDENCE_THRESHOLD = 0.5;

export type BowlingBranchDeps = {
  estimatePoseFromFrames: typeof estimatePoseFromFrames;
  buildPoseSummaryForLlm: typeof buildPoseSummaryForLlm;
  classifyBowlingActionWithGemini: typeof classifyBowlingActionWithGemini;
  scoreBowlingBiomechanicsWithGemini: typeof scoreBowlingBiomechanicsWithGemini;
  /** Intentionally unused on bowling path — present so tests can assert they are never called. */
  assessPoseTrackingSubject?: (...args: unknown[]) => unknown;
  maskForegroundSubjectInFrames?: (...args: unknown[]) => unknown;
  cropFramesToFarEndBatterRoi?: (...args: unknown[]) => unknown;
};

const defaultDeps: BowlingBranchDeps = {
  estimatePoseFromFrames,
  buildPoseSummaryForLlm,
  classifyBowlingActionWithGemini,
  scoreBowlingBiomechanicsWithGemini,
};

export type BowlingBranchInput = {
  analysisId: string;
  videoId: string;
  framesBase64: string[];
  width: number;
  height: number;
  sampleFps: number;
  filename: string;
  durationSeconds: number | null;
  activityResult: ActivityClassificationResult;
  pipelineStart: number;
  tempPath: string | null;
  prisma: {
    analysis: {
      update: (args: unknown) => Promise<unknown>;
    };
  };
  publishStage: (analysisId: string, payload: Record<string, unknown>) => Promise<void>;
  deps?: Partial<BowlingBranchDeps>;
};

export type BowlingBranchOutcome =
  | { status: "COMPLETE"; processingMs: number }
  | { status: "UNSUPPORTED_CONTENT"; rejectionReason: string };

/**
 * Bowling analysis path: uses raw (unmasked, uncropped) pose estimates.
 * Must NOT call assessPoseTrackingSubject / foreground masking / far-end ROI recovery.
 */
export async function runBowlingAnalysisBranch(
  input: BowlingBranchInput
): Promise<BowlingBranchOutcome> {
  const deps: BowlingBranchDeps = { ...defaultDeps, ...input.deps };
  const { analysisId, videoId, framesBase64, width, height, sampleFps, activityResult } = input;

  let poseSummary: string | null = null;
  let posePayload: PoseEstimateResponse | null = null;
  let mediapipeWarning: string | null = null;
  let tempPath = input.tempPath;

  await input.prisma.analysis.update({
    where: { id: analysisId },
    data: { status: "POSE_ANALYSIS" },
  });
  await input.publishStage(analysisId, {
    stage: "POSE_ANALYSIS",
    progress: 40,
    message: "Estimating bowling pose with MediaPipe...",
  });

  try {
    const batchCount = Math.max(1, Math.ceil(framesBase64.length / MEDIAPIPE_FRAMES_PER_BATCH));
    posePayload = await deps.estimatePoseFromFrames({
      framesBase64,
      width,
      height,
      fps: sampleFps,
      analysisId,
    });
    // Critical: use raw pose — no assessPoseTrackingSubject / masking / far-end ROI.
    poseSummary = deps.buildPoseSummaryForLlm(posePayload);
    logMediaPipeOutcome(analysisId, posePayload, {
      framesSentToService: framesBase64.length,
      videoMeta: { width, height, fps: sampleFps },
      batchCount,
    });
    logPoseSummaryForLlm(analysisId, poseSummary);

    const poseJson = Buffer.from(JSON.stringify(posePayload), "utf8");
    const poseKey = `pose-data/${analysisId}/pose.json`;
    await uploadToStorage(poseKey, poseJson, "application/json");
    await input.prisma.analysis.update({
      where: { id: analysisId },
      data: { poseDataPath: poseKey },
    });
  } catch (mpErr) {
    mediapipeWarning =
      mpErr instanceof Error ? mpErr.message : "MediaPipe pose estimation failed";
    console.warn(`[analysisWorker] ${analysisId}: MediaPipe fallback (bowling):`, mediapipeWarning);
    logPoseSummaryForLlm(analysisId, null);
  }

  if (tempPath) {
    await removeTempPath(tempPath);
    tempPath = null;
  }

  await input.prisma.analysis.update({
    where: { id: analysisId },
    data: { status: "SHOT_CLASSIFICATION" },
  });
  await input.publishStage(analysisId, {
    stage: "SHOT_CLASSIFICATION",
    progress: 62,
    message: "Classifying bowling action with Gemini...",
  });

  const bowlingClassification = await deps.classifyBowlingActionWithGemini({
    videoId,
    filename: input.filename,
    durationSeconds: input.durationSeconds,
    poseSummary,
    framesBase64,
    analysisId,
  });

  if (
    bowlingClassification.noBowlerVisible ||
    bowlingClassification.confidence < BOWLING_CONFIDENCE_THRESHOLD
  ) {
    const noGradeReason = bowlingClassification.noBowlerVisible
      ? "No bowling action was visible in the video during classification."
      : `Bowling classification confidence was too low (${Math.round(bowlingClassification.confidence * 100)}%) to produce a reliable grade.`;

    await input.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "UNSUPPORTED_CONTENT",
        bowlingArm: bowlingClassification.bowlingArm,
        bowlingType: bowlingClassification.bowlingType,
        deliveryType: bowlingClassification.deliveryType,
        deliveryConfidence: bowlingClassification.confidence,
        rejectionReason: noGradeReason,
        rawGeminiResponse: {
          bowlingClassification: {
            text: bowlingClassification.rawResponseText,
            bowlingArm: bowlingClassification.bowlingArm,
            bowlingType: bowlingClassification.bowlingType,
            deliveryType: bowlingClassification.deliveryType,
            confidence: bowlingClassification.confidence,
            noBowlerVisible: bowlingClassification.noBowlerVisible,
            reasons: bowlingClassification.reasons,
          },
          activityGate: {
            activityType: activityResult.activityType,
            confidence: activityResult.confidence,
            bowlingConfidence: activityResult.bowlingConfidence,
          },
        },
        completedAt: new Date(),
      },
    });
    await input.publishStage(analysisId, {
      type: "unsupported",
      rejectionReason: noGradeReason,
      redirectUrl: `/analysis/${videoId}`,
    });
    return { status: "UNSUPPORTED_CONTENT", rejectionReason: noGradeReason };
  }

  await input.prisma.analysis.update({
    where: { id: analysisId },
    data: { status: "GENERATING_FEEDBACK" },
  });
  await input.publishStage(analysisId, {
    stage: "GENERATING_FEEDBACK",
    progress: 80,
    message: "Scoring bowling biomechanics...",
  });

  const bowlingScoring = await deps.scoreBowlingBiomechanicsWithGemini({
    bowlingArm: bowlingClassification.bowlingArm,
    bowlingType: bowlingClassification.bowlingType,
    deliveryType: bowlingClassification.deliveryType,
    durationSeconds: input.durationSeconds,
    poseSummary,
    framesBase64,
    analysisId,
  });

  const bowlingScores = bowlingScoring.scores;
  const bowlingGrade = calculateBowlingGrade(bowlingClassification.deliveryType, bowlingScores);
  const deliveryLabel = formatDeliveryType(bowlingClassification.deliveryType).toLowerCase();

  const processingMs = Date.now() - input.pipelineStart;

  await input.prisma.analysis.update({
    where: { id: analysisId },
    data: {
      status: "COMPLETE",
      activityType: "BOWLING",
      bowlingArm: bowlingClassification.bowlingArm,
      bowlingType: bowlingClassification.bowlingType,
      deliveryType: bowlingClassification.deliveryType,
      deliveryConfidence: bowlingClassification.confidence,
      gradeOverall: bowlingGrade.score,
      gradeLetter: bowlingGrade.letter,
      scoreRunUpRhythm: bowlingScores[0],
      scoreLoadUp: bowlingScores[1],
      scoreBowlingArmAction: bowlingScores[2],
      scoreDeliveryStride: bowlingScores[3],
      scoreReleasePoint: bowlingScores[4],
      scoreFollowThrough: bowlingScores[5],
      scoreAlignment: bowlingScores[6],
      scoreBalance: bowlingScores[7],
      technicalFeedback: bowlingScoring.feedback,
      coachingTips: [
        {
          type: "summary",
          title: `${bowlingGrade.letter} — ${deliveryLabel}`,
          description: bowlingScoring.summary,
        },
      ],
      rawGeminiResponse: {
        bowlingClassification: {
          text: bowlingClassification.rawResponseText,
          bowlingArm: bowlingClassification.bowlingArm,
          bowlingType: bowlingClassification.bowlingType,
          deliveryType: bowlingClassification.deliveryType,
          confidence: bowlingClassification.confidence,
          reasons: bowlingClassification.reasons,
        },
        bowlingScoring: {
          text: bowlingScoring.rawResponseText,
          scores: bowlingScoring.scores,
          feedback: bowlingScoring.feedback,
          summary: bowlingScoring.summary,
        },
        mediapipe: posePayload
          ? {
              frames: posePayload.landmarks.length,
              processingMs: posePayload.processingMs,
            }
          : null,
        mediapipeWarning,
      },
      processingMs,
      completedAt: new Date(),
    },
  });

  await input.publishStage(analysisId, {
    type: "complete",
    analysisId,
    videoId,
    redirectUrl: `/analysis/${videoId}`,
  });

  return { status: "COMPLETE", processingMs };
}
