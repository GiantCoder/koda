import { logGeminiRequest } from "@/src/lib/analysis/pipeline-log";
import { cropFramesToFarEndBatterRoi, CLASSIFICATION_FAR_END_ROI } from "@/src/lib/analysis/frame-crop";
import { sampleFramesForShotClassification } from "@/src/lib/analysis/frame-selection";
import { isValidShotType, type ShotTypeValue } from "@/src/lib/cricket/shot-types";
import { parseJsonObject } from "@/src/lib/llm/json-parse";
import {
  BATTING_SCORE_DIMENSIONS,
  type ScoringResult,
} from "@/src/types/technical-feedback";
import { detectLeaveWithGemini } from "./leaveDetection";
import { generateContentTextWithRetryAndFallback } from "./gemini-retry";
import { shotClassificationPrompt } from "./prompts/shotClassification";
import {
  SCORING_FEEDBACK_FEW_SHOT,
  normalizeFeedbackArray,
  normalizeScores,
  normalizeSummary,
  sampleFramesForScoring,
} from "./scoring-feedback";

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

export type BiometricScoringResult = ScoringResult;

/** Default Gemini 3.x model for analysis (override via GEMINI_* env). See https://ai.google.dev/gemini-api/docs/models */
const DEFAULT_GEMINI_ANALYSIS_MODEL = "gemini-3.1-pro-preview";

export function modelNameForTask(task: "classification" | "scoring"): string {
  const fallback = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_ANALYSIS_MODEL;
  return task === "classification"
    ? process.env.GEMINI_CLASSIFICATION_MODEL ?? fallback
    : process.env.GEMINI_SCORING_MODEL ?? fallback;
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
    if (poseSummary && poseSummary.trim().length > 0) {
      return `Pose landmark timeline (RECOVERED BATTER FRAMES — stationary frames extracted from mixed pose; bowler run-up frames removed. Use these with moderate confidence for foot position and wrist height cues):\n${poseSummary.trim()}`;
    }
    return `Pose landmark timeline: NOT AVAILABLE — MediaPipe tracked the foreground bowler's run-up and no stable batter frames could be recovered. Classify using the cropped far-end frames only.`;
  }

  if (poseSummary && poseSummary.trim().length > 0) {
    return `Pose landmark timeline (MediaPipe — verify subject is the batter, not the bowler):\n${poseSummary.trim()}`;
  }

  return "Pose landmark timeline: NOT AVAILABLE — classify from video frames only.";
}

function buildLeaveGateContext(leaveResult: {
  outcome: string;
  confidence: number;
  reasons: string[];
}): string {
  const pct = Math.round(leaveResult.confidence * 100);
  if (leaveResult.outcome === "LEAVE") {
    return `\nLeave gate signal (soft prior — do NOT treat as final decision):
- leave_gate_outcome: LEAVE (${pct}% confidence)
- leave_gate_reasons: ${leaveResult.reasons[0] ?? "bat held away from ball"}
- IMPORTANT: A FORWARD_DEFENCE can look identical to a LEAVE at far-end resolution. Only confirm LEAVE if you can clearly see NO bat movement toward the ball's line. If there is any doubt, or if front_foot_fwd pose cue is present, prefer FORWARD_DEFENCE over LEAVE.\n`;
  }
  if (leaveResult.outcome === "PLAYED") {
    return `\nLeave gate signal (soft prior): leave_gate_outcome: PLAYED (${pct}% confidence) — batter appeared to play at the ball.\n`;
  }
  return `\nLeave gate signal (soft prior): leave_gate_outcome: UNCLEAR (${pct}% confidence) — could not determine leave vs played.\n`;
}

/**
 * Deterministic LEAVE → FORWARD_DEFENCE correction when pose cues contradict a leave.
 * Gemini often ignores front_foot_fwd on low-res nets frames; pose is more reliable here.
 */
function overrideLeaveUsingPoseCues(input: {
  shotType: ShotType;
  ordered: ShotType[];
  confidence: number;
  reasons: string[];
  poseSummary?: string | null;
  analysisId?: string;
}): {
  shotType: ShotType;
  ordered: ShotType[];
  confidence: number;
  reasons: string[];
} {
  const { shotType, ordered, confidence, reasons, poseSummary, analysisId } = input;
  if (shotType !== "LEAVE" || !poseSummary) {
    return { shotType, ordered, confidence, reasons };
  }

  const frontFootCount = (poseSummary.match(/front_foot_fwd/g) ?? []).length;
  const hasDefensiveHands =
    poseSummary.includes("hands_together_mid") || poseSummary.includes("both_wrists_low");

  // Need a clear stride cue; prefer stride + defensive hands, else ≥2 front_foot frames
  if (frontFootCount < 1) {
    return { shotType, ordered, confidence, reasons };
  }
  if (!hasDefensiveHands && frontFootCount < 2) {
    return { shotType, ordered, confidence, reasons };
  }

  const overriddenReasons = [
    `Pose cue override: front_foot_fwd×${frontFootCount}${
      hasDefensiveHands ? " with defensive hand cues" : ""
    } contradicts LEAVE — classified as FORWARD_DEFENCE.`,
    ...reasons,
  ].slice(0, 5);

  if (analysisId) {
    console.log(
      JSON.stringify(
        {
          tag: "analysisPipeline.poseCueOverride",
          analysisId,
          from: "LEAVE",
          to: "FORWARD_DEFENCE",
          frontFootCount,
          hasDefensiveHands,
        },
        null,
        2
      )
    );
  }

  return {
    shotType: "FORWARD_DEFENCE",
    ordered: ["FORWARD_DEFENCE"],
    confidence: Math.max(0.7, Math.min(confidence, 0.88)),
    reasons: overriddenReasons,
  };
}

/** True when the user named a real stroke other than LEAVE — leave gate is unnecessary. */
function userHintSkipsLeaveDetection(input: {
  playerDeclaredShotType?: string | null;
  playerDeclaredShotHints?: string[] | null;
}): boolean {
  const hints: string[] = [];
  const single = input.playerDeclaredShotType?.trim();
  if (single) hints.push(single.toUpperCase());
  for (const hint of input.playerDeclaredShotHints ?? []) {
    if (typeof hint === "string" && hint.trim()) {
      hints.push(hint.trim().toUpperCase());
    }
  }
  return hints.some(
    (hint) => hint !== "UNKNOWN" && hint !== "LEAVE" && isValidShotType(hint)
  );
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

  let leaveGateCtx = "";
  let classificationFrames = input.framesBase64 ?? [];
  if (netsBehindBowler && classificationFrames.length > 0) {
    classificationFrames = await cropFramesToFarEndBatterRoi(
      classificationFrames,
      CLASSIFICATION_FAR_END_ROI
    );

    const skipLeaveGate = userHintSkipsLeaveDetection(input);
    if (skipLeaveGate && input.analysisId) {
      console.log(
        JSON.stringify({
          tag: "analysisPipeline.leaveDetection.skipped",
          analysisId: input.analysisId,
          reason: "user_declared_non_leave_shot_hint",
          playerDeclaredShotType: input.playerDeclaredShotType ?? null,
          playerDeclaredShotHints: input.playerDeclaredShotHints ?? null,
        })
      );
    }

    if (!skipLeaveGate) {
      const leaveResult = await detectLeaveWithGemini({
        framesBase64: classificationFrames,
        analysisId: input.analysisId,
        durationSeconds: input.durationSeconds,
      });

      if (input.analysisId) {
        console.log(
          JSON.stringify(
            {
              tag: "analysisPipeline.leaveGate",
              analysisId: input.analysisId,
              outcome: leaveResult.outcome,
              confidence: leaveResult.confidence,
              reasons: leaveResult.reasons,
              nowUsedAsSoftPrior: true,
            },
            null,
            2
          )
        );
      }

      leaveGateCtx = buildLeaveGateContext(leaveResult);
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
${leaveGateCtx}
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

  let parsed: {
    shotType?: string;
    shotTypesOrdered?: unknown;
    confidence?: number;
    reasons?: string[];
    noBatsman?: boolean;
  } | null = null;

  try {
    parsed = parseJsonObject(rawResponseText);
  } catch (error) {
    console.warn(
      JSON.stringify({
        tag: "analysisPipeline.classification.parseError",
        analysisId: input.analysisId ?? null,
        rawPreview: rawResponseText.slice(0, 500),
        rawCharLength: rawResponseText.length,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  }

  if (!parsed) {
    if (input.analysisId) {
      console.log(
        JSON.stringify(
          {
            tag: "analysisPipeline.gemini.response",
            analysisId: input.analysisId,
            phase: "classification",
            shotType: "UNKNOWN",
            shotTypesOrdered: ["UNKNOWN"],
            confidence: 0,
            noBatsman: false,
            reasons: ["Failed to parse classification response"],
            rawResponseCharLength: rawResponseText.length,
            poseCueOverrideApplied: false,
          },
          null,
          2
        )
      );
    }
    return {
      shotType: "UNKNOWN",
      shotTypesOrdered: ["UNKNOWN"],
      confidence: 0,
      reasons: ["Failed to parse classification response"],
      noBatsman: false,
      rawResponseText,
    };
  }

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

  const corrected = overrideLeaveUsingPoseCues({
    shotType: normalizedShotType,
    ordered,
    confidence,
    reasons,
    poseSummary: input.poseSummary,
    analysisId: input.analysisId,
  });

  if (input.analysisId) {
    console.log(
      JSON.stringify(
        {
          tag: "analysisPipeline.gemini.response",
          analysisId: input.analysisId,
          phase: "classification",
          shotType: corrected.shotType,
          shotTypesOrdered: corrected.ordered,
          confidence: corrected.confidence,
          noBatsman,
          reasons: corrected.reasons,
          rawResponseCharLength: rawResponseText.length,
          poseCueOverrideApplied: corrected.shotType !== normalizedShotType,
        },
        null,
        2
      )
    );
  }

  return {
    shotType: corrected.shotType,
    shotTypesOrdered: corrected.ordered,
    confidence: corrected.confidence,
    reasons: corrected.reasons,
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
  framesBase64?: string[] | null;
  poseTracksForegroundBowlersRunUp?: boolean;
  analysisId?: string;
}): Promise<BiometricScoringResult> {
  const poseUnreliable = Boolean(input.poseTracksForegroundBowlersRunUp);
  const poseAvailable =
    Boolean(input.poseSummary?.trim()) && !poseUnreliable;
  const poseBlock = poseUnreliable
    ? 'Pose data: UNRELIABLE — tracked the foreground bowler, not the batter. Score conservatively from shot type context only; use 45–60 range unless clip metadata strongly supports higher. For every feedback item set timestampSeconds to null and confidence to "low".'
    : poseAvailable
      ? `Pose / joint data (use this as primary evidence for technique scores and timestamps):\n${input.poseSummary!.trim()}`
      : 'Pose data: NOT AVAILABLE — return conservative scores (40–55) to reflect the absence of pose evidence; do not fabricate plausible-looking grades. For every feedback item set timestampSeconds to null and confidence to "low".';

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

  const sampledFrames = sampleFramesForScoring(input.framesBase64);
  const imageParts = sampledFrames.map((b64) => ({
    inlineData: { mimeType: "image/jpeg" as const, data: b64 },
  }));

  const framesNote =
    sampledFrames.length > 0
      ? `Visual frames: ${sampledFrames.length} JPEG stills attached (evenly sampled). Use them to corroborate cues pose landmarks miss (bat face, ball path, front-foot plant).`
      : "Visual frames: NOT AVAILABLE — rely on pose timeline only.";

  const dimensionList = BATTING_SCORE_DIMENSIONS.join(", ");
  const battingFewShot = SCORING_FEEDBACK_FEW_SHOT.replace(
    "Work on your release point.",
    "Work on your weight transfer."
  ).replace(
    "At 0:58 (front-foot plant), your bowling arm is still below shoulder height — release lands early, sending the ball high and resulting in a full toss. Aim to delay release until the arm is vertical, just past the head.",
    "At 0:58 (front-foot plant), your weight is still stacked over the back hip — the drive finishes upright and late. Transfer earlier so the front knee is flexed and the head is over the ball at contact."
  );

  const prompt = `You are a cricket biomechanics analyst.
Score the batter using the pose timeline when present; it reflects body positions across sampled frames.
${framesNote}

Shot type (primary / first in time): ${input.shotType}
Duration seconds: ${input.durationSeconds ?? "unknown"}
${leaveNote}${multi}
${poseBlock}
${battingFewShot}

Return JSON only in this exact shape:
{
  "scores": [backlift, weightTransfer, headPosition, followThrough, timing, balance, footwork, shotSelection],
  "feedback": [
    {
      "dimension": "backlift",
      "score": 0,
      "diagnosis": "1-2 sentences citing a concrete cue",
      "timestampSeconds": 1.24,
      "evidence": "short phrase: joint/frame cue",
      "drill": "one general practice suggestion",
      "confidence": "low" | "medium" | "high"
    }
  ],
  "summary": "1-2 sentence overall roll-up grounded in the same evidence"
}
Rules:
- scores: exactly 8 integers 0–100, order: ${dimensionList}
- feedback: exactly 8 objects in the same order; each dimension must match
- timestampSeconds: number from a pose t=Xs line, or null if not groundable
- Each score in feedback[i].score must match scores[i]`;

  if (input.analysisId) {
    logGeminiRequest(input.analysisId, "scoring", modelNameForTask("scoring"), prompt, {
      shotType: input.shotType,
      shotTypesOrdered: input.shotTypesOrdered ?? null,
      declaredShotCount: input.declaredShotCount ?? null,
      hasPoseSummary: poseAvailable,
      poseTracksForegroundBowlersRunUp: poseUnreliable,
      framesProvided: imageParts.length,
    });
  }

  const rawResponseText = await generateContentTextWithRetryAndFallback("scoring", modelNameForTask("scoring"), {
    contents: [{ role: "user", parts: [...imageParts, { text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  let parsed: {
    scores?: unknown[];
    feedback?: unknown;
    summary?: unknown;
  } = {};
  try {
    parsed = parseJsonObject<{
      scores?: unknown[];
      feedback?: unknown;
      summary?: unknown;
    }>(rawResponseText);
  } catch {
    parsed = {};
  }

  const rawScores = Array.isArray(parsed.scores) ? parsed.scores : [];
  const scores = normalizeScores(rawScores, 8);
  const feedback = normalizeFeedbackArray({
    rawFeedback: parsed.feedback,
    scores,
    dimensions: BATTING_SCORE_DIMENSIONS,
    poseAvailable,
  });
  const summary = normalizeSummary(
    parsed.summary,
    poseAvailable
      ? "Technique scored from pose evidence across the stroke; review per-dimension notes for specifics."
      : "Conservative batting scores due to missing or unreliable pose evidence — re-film with the batter clearly in frame."
  );

  if (input.analysisId) {
    console.log(
      JSON.stringify(
        {
          tag: "analysisPipeline.gemini.response",
          analysisId: input.analysisId,
          phase: "scoring",
          scores,
          feedbackCount: feedback.length,
          summaryPreview: summary.slice(0, 160),
          rawResponseCharLength: rawResponseText.length,
        },
        null,
        2
      )
    );
  }

  return {
    scores,
    feedback,
    summary,
    rawResponseText,
  };
}
