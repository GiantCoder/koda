/**
 * Mirrors app/lib/useAnalysisStatus.ts's stage types/labels and
 * app/lib/uploads-display.ts's UploadProcessingState on the web side, so
 * mobile's processing screen and recent-uploads list speak the same
 * vocabulary as the backend's Analysis.status values.
 */

export type AnalysisStage =
  | "upload_complete"
  | "extracting_frames"
  | "activity_classification"
  | "pose_analysis"
  | "shot_classification"
  | "generating_feedback"
  | "complete"
  | "failed";

const STAGE_ORDER: AnalysisStage[] = [
  "upload_complete",
  "extracting_frames",
  "activity_classification",
  "pose_analysis",
  "shot_classification",
  "generating_feedback",
  "complete",
];

export function getStageIndex(stage: AnalysisStage): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

export function getAllStages(): AnalysisStage[] {
  return STAGE_ORDER;
}

export function getStageLabel(stage: AnalysisStage, activityType?: string | null): string {
  const isBowling = activityType === "BOWLING";
  const labels: Record<AnalysisStage, string> = {
    upload_complete: "Upload Complete",
    extracting_frames: "Extracting Frames",
    activity_classification: "Checking Video Content",
    pose_analysis: isBowling ? "Bowling Pose Analysis" : "Pose Analysis",
    shot_classification: isBowling ? "Bowling Action Classification" : "Shot Classification",
    generating_feedback: isBowling ? "Scoring Bowling Biomechanics" : "Generating Coaching Feedback",
    complete: "Complete",
    failed: "Failed",
  };
  return labels[stage];
}

export type UploadProcessingState = "analyzed" | "processing" | "failed" | "unsupported";

export function processingStateFromAnalysisStatus(status: string | null | undefined): UploadProcessingState {
  if (status === "COMPLETE") return "analyzed";
  if (status === "UNSUPPORTED_CONTENT") return "unsupported";
  if (status === "FAILED") return "failed";
  return "processing";
}
