import type { Analysis, CardTier } from "@prisma/client";

export interface DerivedCardStats {
  statTec: number;
  statPow: number;
  statTim: number;
  statCon: number;
  statPac: number;
  statFie: number;
}

type AnalysisScoreInput = Pick<
  Analysis,
  | "scoreBacklift"
  | "scoreHeadPosition"
  | "scoreBalance"
  | "scoreWeightTransfer"
  | "scoreTiming"
  | "scoreShotSelection"
  | "scoreFootwork"
  | "scoreFollowThrough"
>;

function clampCardStat(value: number): number {
  return Math.max(1, Math.min(99, Math.round(value)));
}

function averageOrDefault(values: Array<number | null>): number {
  const defined = values.filter((value): value is number => value != null);
  if (defined.length === 0) {
    return 50;
  }
  const sum = defined.reduce((acc, value) => acc + value, 0);
  return clampCardStat(sum / defined.length);
}

export function deriveCardStats(analyses: AnalysisScoreInput[]): DerivedCardStats {
  if (analyses.length === 0) {
    return {
      statTec: 50,
      statPow: 50,
      statTim: 50,
      statCon: 50,
      statPac: 50,
      statFie: 50,
    };
  }

  return {
    statTec: averageOrDefault(
      analyses.map((analysis) => {
        const values = [
          analysis.scoreBacklift,
          analysis.scoreHeadPosition,
          analysis.scoreBalance,
        ].filter((score): score is number => score != null);
        if (values.length === 0) {
          return null;
        }
        return values.reduce((sum, score) => sum + score, 0) / values.length;
      })
    ),
    statPow: averageOrDefault(analyses.map((analysis) => analysis.scoreWeightTransfer)),
    statTim: averageOrDefault(analyses.map((analysis) => analysis.scoreTiming)),
    statCon: averageOrDefault(analyses.map((analysis) => analysis.scoreShotSelection)),
    statPac: averageOrDefault(analyses.map((analysis) => analysis.scoreFootwork)),
    statFie: averageOrDefault(analyses.map((analysis) => analysis.scoreFollowThrough)),
  };
}

export function deriveCardTier(avgGrade: number | null): CardTier {
  if (avgGrade == null || avgGrade < 65) {
    return "BRONZE";
  }
  if (avgGrade < 75) {
    return "SILVER";
  }
  if (avgGrade < 88) {
    return "GOLD";
  }
  return "ELITE";
}
