import { logGeminiRequest } from "@/src/lib/analysis/pipeline-log";
import { parseJsonObject } from "@/src/lib/llm/json-parse";
import { generateContentTextWithRetryAndFallback } from "./gemini-retry";
import { modelNameForTask } from "./gemini";

export interface BowlingScoringResult {
  scores: number[];
  rawResponseText: string;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function scoreBowlingBiomechanicsWithGemini(input: {
  bowlingArm: string;
  bowlingType: string;
  deliveryType: string;
  durationSeconds?: number | null;
  poseSummary?: string | null;
  analysisId?: string;
}): Promise<BowlingScoringResult> {
  const poseBlock =
    input.poseSummary && input.poseSummary.trim().length > 0
      ? `Pose / joint data (use this as primary evidence for technique scores):\n${input.poseSummary.trim()}`
      : "Pose data: NOT AVAILABLE — return conservative scores (40–55) to reflect the absence of pose evidence; do not fabricate plausible-looking grades.";

  const prompt = `You are a cricket bowling biomechanics analyst.
Score the bowler using the pose timeline when present; it reflects body positions across sampled frames.

Bowling arm: ${input.bowlingArm}
Bowling type: ${input.bowlingType}
Delivery type: ${input.deliveryType}
Duration seconds: ${input.durationSeconds ?? "unknown"}

${poseBlock}

Return JSON only in this exact shape:
{
  "scores": [runUpRhythm, loadUp, bowlingArmAction, deliveryStride, releasePoint, followThrough, alignment, balance]
}
Each score must be an integer from 0 to 100.`;

  if (input.analysisId) {
    logGeminiRequest(input.analysisId, "bowling_scoring", modelNameForTask("scoring"), prompt, {
      bowlingArm: input.bowlingArm,
      bowlingType: input.bowlingType,
      deliveryType: input.deliveryType,
      hasPoseSummary: Boolean(input.poseSummary?.trim()),
    });
  }

  const rawResponseText = await generateContentTextWithRetryAndFallback(
    "bowling_scoring",
    modelNameForTask("scoring"),
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }
  );

  let parsed: { scores?: unknown[] } = {};
  try {
    parsed = parseJsonObject<{ scores?: unknown[] }>(rawResponseText);
  } catch {
    parsed = {};
  }

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
          phase: "bowling_scoring",
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
