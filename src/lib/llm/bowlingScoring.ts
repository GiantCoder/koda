import { logGeminiRequest } from "@/src/lib/analysis/pipeline-log";
import { parseJsonObject } from "@/src/lib/llm/json-parse";
import {
  BOWLING_SCORE_DIMENSIONS,
  type ScoringResult,
} from "@/src/types/technical-feedback";
import { generateContentTextWithRetryAndFallback } from "./gemini-retry";
import { modelNameForTask } from "./gemini";
import {
  SCORING_FEEDBACK_FEW_SHOT,
  normalizeFeedbackArray,
  normalizeScores,
  normalizeSummary,
  sampleFramesForScoring,
} from "./scoring-feedback";

export type BowlingScoringResult = ScoringResult;

export async function scoreBowlingBiomechanicsWithGemini(input: {
  bowlingArm: string;
  bowlingType: string;
  deliveryType: string;
  durationSeconds?: number | null;
  poseSummary?: string | null;
  framesBase64?: string[] | null;
  analysisId?: string;
}): Promise<BowlingScoringResult> {
  const poseAvailable = Boolean(input.poseSummary?.trim());
  const poseBlock = poseAvailable
    ? `Pose / joint data (use this as primary evidence for technique scores and timestamps):\n${input.poseSummary!.trim()}`
    : "Pose data: NOT AVAILABLE — return conservative scores (40–55) to reflect the absence of pose evidence; do not fabricate plausible-looking grades. For every feedback item set timestampSeconds to null and confidence to \"low\".";

  const sampledFrames = sampleFramesForScoring(input.framesBase64);
  const imageParts = sampledFrames.map((b64) => ({
    inlineData: { mimeType: "image/jpeg" as const, data: b64 },
  }));

  const framesNote =
    sampledFrames.length > 0
      ? `Visual frames: ${sampledFrames.length} JPEG stills attached (evenly sampled). Use them to corroborate cues pose landmarks miss (ball flight, full toss, seam, front-foot plant).`
      : "Visual frames: NOT AVAILABLE — rely on pose timeline only.";

  const dimensionList = BOWLING_SCORE_DIMENSIONS.join(", ");

  const prompt = `You are a cricket bowling biomechanics analyst.
Score the bowler using the pose timeline when present; it reflects body positions across sampled frames.
${framesNote}

Bowling arm: ${input.bowlingArm}
Bowling type: ${input.bowlingType}
Delivery type: ${input.deliveryType}
Duration seconds: ${input.durationSeconds ?? "unknown"}

${poseBlock}
${SCORING_FEEDBACK_FEW_SHOT}

Return JSON only in this exact shape:
{
  "scores": [runUpRhythm, loadUp, bowlingArmAction, deliveryStride, releasePoint, followThrough, alignment, balance],
  "feedback": [
    {
      "dimension": "runUpRhythm",
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
    logGeminiRequest(input.analysisId, "bowling_scoring", modelNameForTask("scoring"), prompt, {
      bowlingArm: input.bowlingArm,
      bowlingType: input.bowlingType,
      deliveryType: input.deliveryType,
      hasPoseSummary: poseAvailable,
      framesProvided: imageParts.length,
    });
  }

  const rawResponseText = await generateContentTextWithRetryAndFallback(
    "bowling_scoring",
    modelNameForTask("scoring"),
    {
      contents: [{ role: "user", parts: [...imageParts, { text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }
  );

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
    dimensions: BOWLING_SCORE_DIMENSIONS,
    poseAvailable,
  });
  const summary = normalizeSummary(
    parsed.summary,
    poseAvailable
      ? "Technique scored from pose evidence across the delivery; review per-dimension notes for specifics."
      : "Conservative bowling scores due to missing pose evidence — re-film side-on with the full delivery in frame."
  );

  if (input.analysisId) {
    console.log(
      JSON.stringify(
        {
          tag: "analysisPipeline.gemini.response",
          analysisId: input.analysisId,
          phase: "bowling_scoring",
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
