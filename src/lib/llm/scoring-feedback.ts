import { sampleFramesEvenly } from "@/src/lib/analysis/frame-selection";
import {
  type FeedbackConfidence,
  type TechniqueFeedbackItem,
  isFeedbackConfidence,
} from "@/src/types/technical-feedback";

/** ~12 frames for scoring — pose timeline carries temporal detail; frames corroborate visuals. */
export const SCORING_FRAME_BUDGET = 12;

export function sampleFramesForScoring(frames: string[] | null | undefined): string[] {
  if (!frames || frames.length === 0) return [];
  return sampleFramesEvenly(frames, SCORING_FRAME_BUDGET);
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeTimestampSeconds(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function normalizeConfidence(value: unknown, poseAvailable: boolean): FeedbackConfidence {
  if (isFeedbackConfidence(value)) return value;
  return poseAvailable ? "medium" : "low";
}

/**
 * Validate/repair feedback to exactly `dimensions.length` entries matching score order.
 * Pads/repairs malformed Gemini output rather than failing the analysis.
 */
export function normalizeFeedbackArray(input: {
  rawFeedback: unknown;
  scores: number[];
  dimensions: readonly string[];
  poseAvailable: boolean;
}): TechniqueFeedbackItem[] {
  const { scores, dimensions, poseAvailable } = input;
  const rawList = Array.isArray(input.rawFeedback) ? input.rawFeedback : [];

  const byDimension = new Map<string, Record<string, unknown>>();
  for (const entry of rawList) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.dimension === "string" && dimensions.includes(e.dimension)) {
      byDimension.set(e.dimension, e);
    }
  }

  return dimensions.map((dimension, index) => {
    const score = scores[index] ?? 0;
    const raw = byDimension.get(dimension) ?? (rawList[index] as Record<string, unknown> | undefined);
    const fromRaw =
      raw && typeof raw === "object" && typeof (raw as { dimension?: unknown }).dimension === "string"
        ? (raw as Record<string, unknown>)
        : raw && typeof raw === "object"
          ? (raw as Record<string, unknown>)
          : null;

    const diagnosis =
      typeof fromRaw?.diagnosis === "string" && fromRaw.diagnosis.trim().length > 0
        ? fromRaw.diagnosis.trim()
        : poseAvailable
          ? `Limited evidence for ${dimension}; review the pose timeline and frames for this phase.`
          : `Insufficient pose evidence to diagnose ${dimension} specifically.`;

    const evidence =
      typeof fromRaw?.evidence === "string" && fromRaw.evidence.trim().length > 0
        ? fromRaw.evidence.trim()
        : poseAvailable
          ? "pose timeline"
          : "no pose data";

    const drill =
      typeof fromRaw?.drill === "string" && fromRaw.drill.trim().length > 0
        ? fromRaw.drill.trim()
        : "Film another repetition from side-on and compare this phase to a clear coaching demo.";

    const timestampSeconds = poseAvailable
      ? normalizeTimestampSeconds(fromRaw?.timestampSeconds)
      : null;

    const confidence = normalizeConfidence(fromRaw?.confidence, poseAvailable);

    return {
      dimension,
      score: typeof fromRaw?.score === "number" ? clampScore(fromRaw.score) : score,
      diagnosis,
      timestampSeconds,
      evidence,
      drill,
      confidence: poseAvailable ? confidence : "low",
    };
  });
}

export function normalizeScores(rawScores: unknown[], length = 8): number[] {
  const normalized = rawScores
    .slice(0, length)
    .map((value) => (typeof value === "number" ? clampScore(value) : 0));
  while (normalized.length < length) {
    normalized.push(0);
  }
  return normalized;
}

export function normalizeSummary(raw: unknown, fallback: string): string {
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  return fallback;
}

export const SCORING_FEEDBACK_FEW_SHOT = `
Feedback quality standard (follow this closely):
- Bad: "Work on your release point." (generic, no evidence, not actionable)
- Good: "At 0:58 (front-foot plant), your bowling arm is still below shoulder height — release lands early, sending the ball high and resulting in a full toss. Aim to delay release until the arm is vertical, just past the head."

Hard rules:
- Never invent a timestamp that is not present in the supplied pose block (lines like t=1.24s).
- If pose data is unavailable for a dimension, set timestampSeconds to null and confidence to "low"; keep diagnosis qualitative.
- Each diagnosis must reference either a t=Xs timestamp from the pose block or a specific visual detail from the attached frames — never a generic statement.
- Drills are general practice suggestions, not citations from a certified library.
`;
