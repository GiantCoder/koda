/** Debug logging for the video → MediaPipe → Gemini pipeline (worker / server logs). */

import type { PoseEstimateResponse } from "./mediapipe-types";

const DEFAULT_PROMPT_PREVIEW = 4500;
const DEFAULT_POSE_JSON_PREVIEW = 6000;

function envBool(name: string): boolean {
  const v = process.env[name]?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** When set, log full prompt text (can be very large). */
export function analysisLogFullPrompts(): boolean {
  return envBool("KODA_ANALYSIS_LOG_FULL_PROMPTS");
}

export function truncateForLog(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen)}\n...[truncated ${text.length - maxLen} more chars]`;
}

const KEY_SAMPLE = [
  "nose",
  "leftShoulder",
  "rightShoulder",
  "leftHip",
  "rightHip",
  "leftWrist",
  "rightWrist",
] as const;

/** Log structured summary after MediaPipe returns (no raw frame base64). */
export function logMediaPipeOutcome(
  analysisId: string,
  pose: PoseEstimateResponse,
  ctx: {
    framesSentToService: number;
    videoMeta: { width: number; height: number; fps: number };
    batchCount: number;
  }
): void {
  const { landmarks } = pose;
  const confidences = landmarks.map((l) => l.poseConfidence);
  const avgConf =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  const first = landmarks[0];
  const last = landmarks[landmarks.length - 1];
  const sampleKeypoints = (frame: typeof first | undefined) => {
    if (!frame) return null;
    const out: Record<string, { x: number; y: number; v: number }> = {};
    for (const k of KEY_SAMPLE) {
      const p = frame.keypoints[k];
      if (p) {
        out[k] = { x: p.x, y: p.y, v: p.visibility };
      }
    }
    return out;
  };

  const payload = {
    tag: "analysisPipeline.mediapipe",
    analysisId,
    framesSentToService: ctx.framesSentToService,
    batches: ctx.batchCount,
    videoMeta: ctx.videoMeta,
    landmarkFramesReturned: landmarks.length,
    landmarkFrameIndicesSample: landmarks.length > 0
      ? landmarks
          .filter((_, i) => i === 0 || i === landmarks.length - 1 || i % Math.max(1, Math.floor(landmarks.length / 6)) === 0)
          .slice(0, 8)
          .map((l) => l.frameIndex)
      : [],
    processingMsService: pose.processingMs,
    batsmanBbox: pose.batsman_bbox ?? null,
    poseConfidence: {
      min: confidences.length ? Math.min(...confidences) : null,
      max: confidences.length ? Math.max(...confidences) : null,
      avg: Number(avgConf.toFixed(4)),
    },
    firstFrame: first
      ? {
          frameIndex: first.frameIndex,
          timestampSec: first.timestamp,
          poseConfidence: first.poseConfidence,
          keypointSample: sampleKeypoints(first),
        }
      : null,
    lastFrame: last
      ? {
          frameIndex: last.frameIndex,
          timestampSec: last.timestamp,
          poseConfidence: last.poseConfidence,
          keypointSample: sampleKeypoints(last),
        }
      : null,
  };

  console.log(JSON.stringify(payload, null, 2));
}

/** Log the pose summary string length and preview (what Gemini receives as pose evidence). */
export function logPoseSummaryForLlm(analysisId: string, poseSummary: string | null): void {
  if (!poseSummary || !poseSummary.trim()) {
    console.log(
      JSON.stringify(
        {
          tag: "analysisPipeline.poseSummaryForLlm",
          analysisId,
          present: false,
          charLength: 0,
        },
        null,
        2
      )
    );
    return;
  }
  const max = analysisLogFullPrompts() ? poseSummary.length : DEFAULT_POSE_JSON_PREVIEW;
  console.log(
    JSON.stringify(
      {
        tag: "analysisPipeline.poseSummaryForLlm",
        analysisId,
        present: true,
        charLength: poseSummary.length,
        preview: truncateForLog(poseSummary.trim(), max),
      },
      null,
      2
    )
  );
}

/** Log full prompt sent to Gemini (truncated unless KODA_ANALYSIS_LOG_FULL_PROMPTS=1). */
export function logGeminiRequest(
  analysisId: string,
  phase: "classification" | "scoring" | "leave_detection" | "activity_gate",
  modelName: string,
  prompt: string,
  extra?: Record<string, unknown>
): void {
  const max = analysisLogFullPrompts() ? prompt.length : DEFAULT_PROMPT_PREVIEW;
  console.log(
    JSON.stringify(
      {
        tag: "analysisPipeline.gemini",
        analysisId,
        phase,
        modelName,
        promptCharLength: prompt.length,
        promptPreview: truncateForLog(prompt, max),
        ...extra,
      },
      null,
      2
    )
  );
}
