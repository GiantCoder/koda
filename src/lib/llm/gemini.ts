import { logGeminiRequest } from "@/src/lib/analysis/pipeline-log";
import { isValidShotType, type ShotTypeValue } from "@/src/lib/cricket/shot-types";
import { generateContentTextWithRetryAndFallback } from "./gemini-retry";
import { shotClassificationPrompt } from "./prompts/shotClassification";

type ShotType = ShotTypeValue;

interface ShotClassificationResult {
  shotType: ShotType;
  /** Model output in timeline order; first matches shotType. */
  shotTypesOrdered: ShotType[];
  confidence: number;
  reasons: string[];
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

export async function classifyShotWithGemini(input: {
  videoId: string;
  filename: string;
  durationSeconds?: number | null;
  resolutionWidth?: number | null;
  resolutionHeight?: number | null;
  /** MediaPipe-derived landmark summary; when absent, classification uses metadata only. */
  poseSummary?: string | null;
  /** Shadow batting: single shot hint from the player. */
  playerDeclaredShotType?: string | null;
  /** Dashboard upload: declared stroke count + per-stroke hints. */
  declaredShotCount?: number | null;
  playerDeclaredShotHints?: string[] | null;
  /** Worker log correlation for pipeline debugging. */
  analysisId?: string;
}): Promise<ShotClassificationResult> {
  const poseBlock =
    input.poseSummary && input.poseSummary.trim().length > 0
      ? `Pose landmark timeline (MediaPipe):\n${input.poseSummary.trim()}`
      : "Pose landmark timeline: NOT AVAILABLE — infer from metadata only and use low confidence.";

  const declared =
    input.playerDeclaredShotType && input.playerDeclaredShotType.trim().length > 0
      ? `Player-declared shot (hint): ${input.playerDeclaredShotType.trim()}`
      : "Player-declared shot (hint): none";

  const uploadCtx = buildUploadDeclaredShotsContext(input.declaredShotCount, input.playerDeclaredShotHints);

  const prompt = `${shotClassificationPrompt}

Context:
- videoId: ${input.videoId}
- filename: ${input.filename}
- durationSeconds: ${input.durationSeconds ?? "unknown"}
- resolution: ${input.resolutionWidth ?? "unknown"}x${input.resolutionHeight ?? "unknown"}
- ${declared}${uploadCtx}

${poseBlock}

Return JSON only, no markdown code fences.`;

  if (input.analysisId) {
    logGeminiRequest(input.analysisId, "classification", modelNameForTask("classification"), prompt, {
      playerDeclaredShotType: input.playerDeclaredShotType ?? null,
      declaredShotCount: input.declaredShotCount ?? null,
      playerDeclaredShotHints: input.playerDeclaredShotHints ?? null,
      hasPoseSummary: Boolean(input.poseSummary?.trim()),
    });
  }

  const rawResponseText = await generateContentTextWithRetryAndFallback("classification", modelNameForTask("classification"), {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
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

  const confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;

  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.filter((item): item is string => typeof item === "string").slice(0, 5)
    : [];

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
  analysisId?: string;
}): Promise<BiometricScoringResult> {
  const poseBlock =
    input.poseSummary && input.poseSummary.trim().length > 0
      ? `Pose / joint data (use this as primary evidence for technique scores):\n${input.poseSummary.trim()}`
      : "Pose data: NOT AVAILABLE — estimate conservatively from shot type and duration; prefer mid-range scores (65–78) with moderate variance.";

  const multi =
    input.shotTypesOrdered && input.shotTypesOrdered.length > 1
      ? `\nThis clip may include multiple batting strokes. Classified sequence (chronological): ${input.shotTypesOrdered.join(" → ")}. Score overall technique across the sampled timeline, not only the first stroke.\n`
      : input.declaredShotCount && input.declaredShotCount > 1
        ? `\nThe player indicated multiple strokes in this clip; sampled poses may blend actions — score conservatively and holistically.\n`
        : "";

  const prompt = `You are a cricket biomechanics analyst.
Score the batter using the pose timeline when present; it reflects body positions across sampled frames.

Shot type (primary / first in time): ${input.shotType}
Duration seconds: ${input.durationSeconds ?? "unknown"}
${multi}
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
      hasPoseSummary: Boolean(input.poseSummary?.trim()),
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
    normalizedScores.push(75);
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
