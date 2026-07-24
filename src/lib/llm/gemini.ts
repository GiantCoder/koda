import { logGeminiRequest } from "@/src/lib/analysis/pipeline-log";
import { cropFramesToFarEndBand } from "@/src/lib/analysis/frame-crop";
import { sampleFramesForShotClassification } from "@/src/lib/analysis/frame-selection";
import { isValidShotType, type ShotTypeValue } from "@/src/lib/cricket/shot-types";
import { detectLeaveWithGemini, leaveDetectionThreshold } from "./leaveDetection";
import { generateContentTextWithRetryAndFallback } from "./gemini-retry";
import { shotClassificationPrompt } from "./prompts/shotClassification";

type ShotType = ShotTypeValue;

interface ShotClassificationResult {
  shotType: ShotType;
  /** Model output in timeline order; first matches shotType. */
  shotTypesOrdered: ShotType[];
  confidence: number;
  reasons: string[];
  noBatsman: boolean;
  rawResponseText: string;
}

interface BiometricScoringResult {
  scores: number[];
  rawResponseText: string;
}

/** Default Gemini 3.x model for analysis (override via GEMINI_* env). See https://ai.google.dev/gemini-api/docs/models */
const DEFAULT_GEMINI_ANALYSIS_MODEL = "gemini-3.1-pro-preview";

export function modelNameForTask(task: "classification" | "scoring"): string {
  const fallback = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_ANALYSIS_MODEL;
  return task === "classification"
    ? process.env.GEMINI_CLASSIFICATION_MODEL ?? fallback
    : process.env.GEMINI_SCORING_MODEL ?? fallback;
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }
  return trimmed.slice(start, end + 1);
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildUploadDeclaredShotsContext(
  declaredShotCount: number | null | undefined,
  hints: string[] | null | undefined
): string {
  if (declaredShotCount == null || declaredShotCount < 1) {
    return "";
  }
  const list = hints ?? [];
  if (declaredShotCount === 1) {
    const h = list[0];
    if (h && h !== "UNKNOWN") {
      return `\nUpload clip context: user expects 1 stroke; hint: ${h}.`;
    }
    return "";
  }
  const lines = list.map((h, i) => {
    const label = h === "UNKNOWN" ? "no specific type hint" : h;
    return `  Stroke ${i + 1}: ${label}`;
  });
  return `\nUpload clip context: user expects about ${declaredShotCount} distinct strokes in chronological order:\n${lines.join("\n")}\n`;
}

function buildPoseBlockForClassification(
  poseSummary: string | null | undefined,
  poseTracksForegroundBowlersRunUp: boolean
): string {
  if (poseTracksForegroundBowlersRunUp) {
    return `Pose landmark timeline: NOT AVAILABLE — MediaPipe tracked the foreground bowler's run-up, not the distant batter. Classify using the cropped far-end batter frames only; do not use pose heuristics.`;
  }

  if (poseSummary && poseSummary.trim().length > 0) {
    return `Pose landmark timeline (MediaPipe — verify subject is the batter, not the bowler):\n${poseSummary.trim()}`;
  }

  return "Pose landmark timeline: NOT AVAILABLE — classify from video frames only.";
}

export async function classifyShotWithGemini(input: {
  videoId: string;
  filename: string;
  durationSeconds?: number | null;
  resolutionWidth?: number | null;
  resolutionHeight?: number | null;
  /** MediaPipe-derived landmark summary; when absent, classification uses metadata only. */
  poseSummary?: string | null;
  /** Sampled JPEG frames for multimodal classification. */
  framesBase64?: string[] | null;
  /** When true, pose timeline is bowler run-up — ignored for classification. */
  poseTracksForegroundBowlersRunUp?: boolean;
  /** Shadow batting: single shot hint from the player. */
  playerDeclaredShotType?: string | null;
  /** Dashboard upload: declared stroke count + per-stroke hints. */
  declaredShotCount?: number | null;
  playerDeclaredShotHints?: string[] | null;
  /** Worker log correlation for pipeline debugging. */
  analysisId?: string;
}): Promise<ShotClassificationResult> {
  const netsBehindBowler = Boolean(input.poseTracksForegroundBowlersRunUp);
  const poseBlock = buildPoseBlockForClassification(
    input.poseSummary,
    netsBehindBowler
  );

  const declared =
    input.playerDeclaredShotType && input.playerDeclaredShotType.trim().length > 0
      ? `Player-declared shot (hint): ${input.playerDeclaredShotType.trim()}`
      : "Player-declared shot (hint): none";

  const uploadCtx = buildUploadDeclaredShotsContext(input.declaredShotCount, input.playerDeclaredShotHints);

  const singleDeliveryCtx =
    input.declaredShotCount === 1 || (input.durationSeconds != null && input.durationSeconds <= 6)
      ? "\nThis clip is a single delivery — shotTypesOrdered must contain exactly one token.\n"
      : "";

  let classificationFrames = input.framesBase64 ?? [];
  if (netsBehindBowler && classificationFrames.length > 0) {
    classificationFrames = await cropFramesToFarEndBand(classificationFrames);

    const leaveResult = await detectLeaveWithGemini({
      framesBase64: classificationFrames,
      analysisId: input.analysisId,
      durationSeconds: input.durationSeconds,
    });

    if (
      leaveResult.outcome === "LEAVE" &&
      leaveResult.confidence >= leaveDetectionThreshold()
    ) {
      const reasons = leaveResult.reasons.length
        ? leaveResult.reasons
        : ["Batter let the ball pass without playing at it (leave detection gate)."];

      if (input.analysisId) {
        console.log(
          JSON.stringify(
            {
              tag: "analysisPipeline.gemini.response",
              analysisId: input.analysisId,
              phase: "classification",
              shotType: "LEAVE",
              shotTypesOrdered: ["LEAVE"],
              confidence: leaveResult.confidence,
              noBatsman: false,
              reasons,
              viaLeaveGate: true,
              rawResponseCharLength: leaveResult.rawResponseText.length,
            },
            null,
            2
          )
        );
      }

      return {
        shotType: "LEAVE",
        shotTypesOrdered: ["LEAVE"],
        confidence: leaveResult.confidence,
        reasons,
        noBatsman: false,
        rawResponseText: leaveResult.rawResponseText,
      };
    }
  }

  const sampledForClassify =
    classificationFrames.length > 0
      ? sampleFramesForShotClassification(classificationFrames, {
          durationSeconds: input.durationSeconds,
          netsBehindBowler,
        })
      : [];

  const frameNote = netsBehindBowler
    ? "cropped to far-end batter band; bowler removed from frame"
    : "tail-weighted for short clips — later frames show batter response";

  const imageParts = sampledForClassify.map((b64) => ({
    inlineData: { mimeType: "image/jpeg" as const, data: b64 },
  }));

  const prompt = `${shotClassificationPrompt}

Context:
- videoId: ${input.videoId}
- filename: ${input.filename}
- durationSeconds: ${input.durationSeconds ?? "unknown"}
- resolution: ${input.resolutionWidth ?? "unknown"}x${input.resolutionHeight ?? "unknown"}
- ${declared}${uploadCtx}${singleDeliveryCtx}
- framesForClassification: ${sampledForClassify.length} (${frameNote})

${poseBlock}

Return JSON only, no markdown code fences.`;

  if (input.analysisId) {
    logGeminiRequest(input.analysisId, "classification", modelNameForTask("classification"), prompt, {
      playerDeclaredShotType: input.playerDeclaredShotType ?? null,
      declaredShotCount: input.declaredShotCount ?? null,
      playerDeclaredShotHints: input.playerDeclaredShotHints ?? null,
      hasPoseSummary: Boolean(input.poseSummary?.trim()),
      poseTracksForegroundBowlersRunUp: netsBehindBowler,
      croppedFarEndBand: netsBehindBowler,
      framesProvided: imageParts.length,
    });
  }

  const rawResponseText = await generateContentTextWithRetryAndFallback("classification", modelNameForTask("classification"), {
    contents: [{ role: "user", parts: [...imageParts, { text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
  const jsonText = extractJsonObject(rawResponseText);
  const parsed = JSON.parse(jsonText) as {
    shotType?: string;
    shotTypesOrdered?: unknown;
    confidence?: number;
    reasons?: string[];
    noBatsman?: boolean;
  };

  const ordered: ShotType[] = [];
  if (Array.isArray(parsed.shotTypesOrdered)) {
    for (const item of parsed.shotTypesOrdered) {
      if (typeof item === "string" && isValidShotType(item)) {
        ordered.push(item);
      }
    }
  }

  let normalizedShotType: ShotType;
  if (ordered.length > 0) {
    normalizedShotType = ordered[0];
  } else {
    const raw = parsed.shotType ?? "";
    normalizedShotType = isValidShotType(raw) ? raw : "UNKNOWN";
    ordered.push(normalizedShotType);
  }

  // Single-delivery clips: never keep a spurious multi-stroke list from the model.
  const singleDelivery =
    input.declaredShotCount === 1 || (input.durationSeconds != null && input.durationSeconds <= 6);
  if (singleDelivery && ordered.length > 1) {
    ordered.splice(1);
  }

  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;

  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((item): item is string => typeof item === "string").slice(0, 5)
    : [];

  const noBatsman = typeof parsed.noBatsman === "boolean" ? parsed.noBatsman : false;

  if (input.analysisId) {
    console.log(
      JSON.stringify(
        {
          tag: "analysisPipeline.gemini.response",
          analysisId: input.analysisId,
          phase: "classification",
          shotType: normalizedShotType,
          shotTypesOrdered: ordered,
          confidence,
          noBatsman,
          reasons,
          rawResponseCharLength: rawResponseText.length,
        },
        null,
        2
      )
    );
  }

  return {
    shotType: normalizedShotType,
    shotTypesOrdered: ordered,
    confidence,
    reasons,
    noBatsman,
    rawResponseText,
  };
}

export async function scoreBiomechanicsWithGemini(input: {
  shotType: ShotType;
  /** Timeline order from classification; used when clip may contain multiple strokes. */
  shotTypesOrdered?: ShotType[];
  declaredShotCount?: number | null;
  durationSeconds?: number | null;
  poseSummary?: string | null;
  poseTracksForegroundBowlersRunUp?: boolean;
  analysisId?: string;
}): Promise<BiometricScoringResult> {
  const poseUnreliable = Boolean(input.poseTracksForegroundBowlersRunUp);
  const poseBlock = poseUnreliable
    ? "Pose data: UNRELIABLE — tracked the foreground bowler, not the batter. Score conservatively from shot type context only; use 45–60 range unless clip metadata strongly supports higher."
    : input.poseSummary && input.poseSummary.trim().length > 0
      ? `Pose / joint data (use this as primary evidence for technique scores):\n${input.poseSummary.trim()}`
      : "Pose data: NOT AVAILABLE — return conservative scores (40–55) to reflect the absence of pose evidence; do not fabricate plausible-looking grades.";

  const multi =
    input.shotTypesOrdered && input.shotTypesOrdered.length > 1
      ? `\nThis clip may include multiple batting strokes. Classified sequence (chronological): ${input.shotTypesOrdered.join(" → ")}. Score overall technique across the sampled timeline, not only the first stroke.\n`
      : input.declaredShotCount && input.declaredShotCount > 1
        ? `\nThe player indicated multiple strokes in this clip; sampled poses may blend actions — score conservatively and holistically.\n`
        : "";

  const leaveNote =
    input.shotType === "LEAVE"
      ? `\nThis is a LEAVE — the batter deliberately let the ball pass. Score head stillness, judgement (not playing at the ball), balance while withdrawing, and bat kept away from the ball line. Do not penalise for lack of bat-ball contact or drive follow-through.\n`
      : "";

  const prompt = `You are a cricket biomechanics analyst.
Score the batter using the pose timeline when present; it reflects body positions across sampled frames.

Shot type (primary / first in time): ${input.shotType}
Duration seconds: ${input.durationSeconds ?? "unknown"}
${leaveNote}${multi}
${poseBlock}

Return JSON only in this exact shape:
{
  "scores": [backlift, weightTransfer, headPosition, followThrough, timing, balance, footwork, shotSelection]
}
Each score must be an integer from 0 to 100.`;

  if (input.analysisId) {
    logGeminiRequest(input.analysisId, "scoring", modelNameForTask("scoring"), prompt, {
      shotType: input.shotType,
      shotTypesOrdered: input.shotTypesOrdered ?? null,
      declaredShotCount: input.declaredShotCount ?? null,
      hasPoseSummary: Boolean(input.poseSummary?.trim()) && !poseUnreliable,
      poseTracksForegroundBowlersRunUp: poseUnreliable,
    });
  }

  const rawResponseText = await generateContentTextWithRetryAndFallback("scoring", modelNameForTask("scoring"), {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
  const jsonText = extractJsonObject(rawResponseText);
  const parsed = JSON.parse(jsonText) as { scores?: unknown[] };

  const rawScores = Array.isArray(parsed.scores) ? parsed.scores : [];
  const normalizedScores = rawScores
    .slice(0, 8)
    .map((value) => (typeof value === "number" ? clampScore(value) : 0));

  while (normalizedScores.length < 8) {
    normalizedScores.push(0);
  }

  if (input.analysisId) {
    console.log(
      JSON.stringify(
        {
          tag: "analysisPipeline.gemini.response",
          analysisId: input.analysisId,
          phase: "scoring",
          scores: normalizedScores,
          rawResponseCharLength: rawResponseText.length,
        },
        null,
        2
      )
    );
  }

  return {
    scores: normalizedScores,
    rawResponseText,
  };
}
