/** Per-dimension grounded coaching feedback from Gemini scoring. */
export interface TechniqueFeedbackItem {
  dimension: string;
  score: number;
  /** 1–2 sentences citing a concrete cue from pose/frames. */
  diagnosis: string;
  /** Nearest evidenced timestamp from the pose block; null if not groundable. */
  timestampSeconds: number | null;
  /** Short phrase: which joint/frame cue supports the diagnosis. */
  evidence: string;
  /** One general practice suggestion (not from a vetted library). */
  drill: string;
  confidence: "low" | "medium" | "high";
}

export interface ScoringResult {
  /** 8 ints, same order as today — still drives scoreX columns. */
  scores: number[];
  /** Exactly 8 items, same order as scores. */
  feedback: TechniqueFeedbackItem[];
  /** 1–2 sentence overall roll-up (replaces hardcoded template functions). */
  summary: string;
  rawResponseText: string;
}

export const BATTING_SCORE_DIMENSIONS = [
  "backlift",
  "weightTransfer",
  "headPosition",
  "followThrough",
  "timing",
  "balance",
  "footwork",
  "shotSelection",
] as const;

export const BOWLING_SCORE_DIMENSIONS = [
  "runUpRhythm",
  "loadUp",
  "bowlingArmAction",
  "deliveryStride",
  "releasePoint",
  "followThrough",
  "alignment",
  "balance",
] as const;

export type BattingScoreDimension = (typeof BATTING_SCORE_DIMENSIONS)[number];
export type BowlingScoreDimension = (typeof BOWLING_SCORE_DIMENSIONS)[number];

export const FEEDBACK_CONFIDENCE_VALUES = ["low", "medium", "high"] as const;
export type FeedbackConfidence = (typeof FEEDBACK_CONFIDENCE_VALUES)[number];

const DIMENSION_LABELS: Record<string, string> = {
  backlift: "Backlift",
  weightTransfer: "Weight Transfer",
  headPosition: "Head Position",
  followThrough: "Follow-Through",
  timing: "Timing",
  balance: "Balance",
  footwork: "Footwork",
  shotSelection: "Shot Selection",
  runUpRhythm: "Run-Up Rhythm",
  loadUp: "Load-Up",
  bowlingArmAction: "Bowling Arm Action",
  deliveryStride: "Delivery Stride",
  releasePoint: "Release Point",
  alignment: "Alignment",
};

export function formatDimensionLabel(dimension: string): string {
  return DIMENSION_LABELS[dimension] ?? dimension;
}

export function isFeedbackConfidence(value: unknown): value is FeedbackConfidence {
  return (
    typeof value === "string" &&
    (FEEDBACK_CONFIDENCE_VALUES as readonly string[]).includes(value)
  );
}

export function parseTechnicalFeedback(raw: unknown): TechniqueFeedbackItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items: TechniqueFeedbackItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.dimension !== "string") continue;
    if (typeof e.score !== "number" || !Number.isFinite(e.score)) continue;
    if (typeof e.diagnosis !== "string") continue;
    if (typeof e.evidence !== "string") continue;
    if (typeof e.drill !== "string") continue;
    if (!isFeedbackConfidence(e.confidence)) continue;
    const ts =
      e.timestampSeconds === null
        ? null
        : typeof e.timestampSeconds === "number" && Number.isFinite(e.timestampSeconds)
          ? e.timestampSeconds
          : null;
    items.push({
      dimension: e.dimension,
      score: Math.max(0, Math.min(100, Math.round(e.score))),
      diagnosis: e.diagnosis,
      timestampSeconds: ts,
      evidence: e.evidence,
      drill: e.drill,
      confidence: e.confidence,
    });
  }
  return items.length > 0 ? items : null;
}
