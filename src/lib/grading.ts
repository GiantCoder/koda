const shotTypeWeights: Record<string, number> = {
  COVER_DRIVE: 1.1,
  STRAIGHT_DRIVE: 1.1,
  OFF_DRIVE: 1.05,
  ON_DRIVE: 1.05,
  DEFENSIVE: 0.9,
  FORWARD_DEFENCE: 0.9,
  BACK_FOOT_DEFENCE: 0.9,
  UNKNOWN: 1.0,
};

/** Calculate weighted overall grade from biomechanical metrics. */
export function calculateGrade(shotType: string, scores: number[]): { score: number; letter: string } {
  const base = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  const weighted = Math.max(0, Math.min(100, base * (shotTypeWeights[shotType] ?? 1)));

  if (weighted >= 85) return { score: weighted, letter: "A" };
  if (weighted >= 75) return { score: weighted, letter: "B+" };
  if (weighted >= 65) return { score: weighted, letter: "B" };
  if (weighted >= 55) return { score: weighted, letter: "C+" };
  return { score: weighted, letter: "C" };
}
