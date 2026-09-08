import type { TechniqueFeedbackItem } from "./technical-feedback";

/** Shared Analysis payload shape returned by analysis API routes. */
export interface AnalysisApiResponse {
  id: string;
  videoId: string;
  status: string;
  activityType?: string | null;
  coachingTips: unknown;
  technicalFeedback: TechniqueFeedbackItem[] | null;
  gradeOverall?: number | null;
  gradeLetter?: string | null;
  frameManifest?: unknown;
  [key: string]: unknown;
}

export type { TechniqueFeedbackItem, ScoringResult } from "./technical-feedback";
