const shotTypeWeights: Record<string, number> = {
  COVER_DRIVE: 1.1,
  STRAIGHT_DRIVE: 1.1,
  OFF_DRIVE: 1.05,
  ON_DRIVE: 1.05,
  DEFENSIVE: 0.9,
  FORWARD_DEFENCE: 0.9,
  BACK_FOOT_DEFENCE: 0.9,
  LEAVE: 0.85,
  UNKNOWN: 1.0,
};

const deliveryTypeWeights: Record<string, number> = {
  YORKER: 1.1,
  GOOD_LENGTH: 1.05,
  BOUNCER: 1.05,
  FULL: 1.0,
  SHORT: 1.0,
  FULL_TOSS: 0.95,
  SLOWER_BALL: 1.05,
  OFF_BREAK: 1.0,
  LEG_BREAK: 1.0,
  GOOGLY: 1.0,
  ARM_BALL: 1.0,
  TOP_SPINNER: 1.0,
  UNKNOWN: 1.0,
};

function letterFromWeightedScore(weighted: number): string {
  if (weighted >= 85) return "A";
  if (weighted >= 75) return "B+";
  if (weighted >= 65) return "B";
  if (weighted >= 55) return "C+";
  return "C";
}

/** Calculate weighted overall grade from biomechanical metrics. */
export function calculateGrade(shotType: string, scores: number[]): { score: number; letter: string } {
  const base = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  const weighted = Math.max(0, Math.min(100, base * (shotTypeWeights[shotType] ?? 1)));
  return { score: weighted, letter: letterFromWeightedScore(weighted) };
}

/** Calculate weighted overall grade from bowling biomechanical metrics. */
export function calculateBowlingGrade(
  deliveryType: string,
  scores: number[]
): { score: number; letter: string } {
  const base = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  const weighted = Math.max(0, Math.min(100, base * (deliveryTypeWeights[deliveryType] ?? 1)));
  return { score: weighted, letter: letterFromWeightedScore(weighted) };
}
