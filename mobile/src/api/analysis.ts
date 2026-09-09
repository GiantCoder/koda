/**
 * Wraps the analysis-detail endpoints web's `app/(dashboard)/analysis/[videoId]`
 * page calls: the main analysis record (GET /api/analysis/video/[videoId]),
 * the frame gallery (GET /api/analysis/[id]/frames[/[index]]), the pose
 * skeleton data (GET /api/analysis/[id]/pose), and coach annotations
 * (GET/POST /api/analysis/[id]/annotations). All four are real, DB-backed
 * routes -- no backend changes needed (see Phase 4 research notes in the
 * roadmap doc). `/api/analysis/[id]/report` (PDF export) is a dead-end MVP
 * stub with no UI entry point anywhere on web either, so it's not wrapped
 * here. The two "reprocess as batting/bowling" endpoints are real but were
 * deliberately left out of mobile's v1 scope (edge-case misclassification
 * fix, adds queue-state complexity) -- see roadmap doc for the full reasoning.
 */
import { apiFetch } from "./client";

export interface AssignedPlayer {
  id: string;
  displayName: string;
}

export interface AnalysisVideo {
  id?: string;
  filename?: string | null;
  cdnUrl: string | null;
  durationSeconds: number | null;
  resolutionWidth: number | null;
  resolutionHeight: number | null;
  tags?: string[];
  assignedPlayer?: AssignedPlayer | null;
}

export interface RawGeminiResponse {
  classification?: {
    shotType?: string;
    confidence?: number;
    reasons?: string[];
    noBatsman?: boolean;
  };
  bowlingClassification?: {
    bowlingArm?: string;
    bowlingType?: string;
    deliveryType?: string;
    confidence?: number;
    reasons?: string[];
    noBowlerVisible?: boolean;
  };
  activityGate?: {
    activityType?: string;
    confidence?: number;
  };
}

/** One item of `Analysis.coachingTips` (Json) -- shape mirrors web's
 * `CoachingTip` in app/components/analysis/CoachingTipsPanel.tsx. */
export interface CoachingTip {
  title: string;
  body: string;
  description?: string;
  type?: "strength" | "improvement" | "recommendation";
}

/** One item of `Analysis.technicalFeedback` (Json) -- mirrors web's
 * `TechniqueFeedbackItem` in src/types/technical-feedback.ts. Per-dimension,
 * grounded coaching feedback (diagnosis/evidence/drill), richer than the
 * plain coachingTips array. */
export interface TechnicalFeedbackItem {
  dimension: string;
  score: number;
  diagnosis: string;
  timestampSeconds: number | null;
  evidence: string;
  drill: string;
  confidence: "low" | "medium" | "high";
}

/** Mirrors web's `AnalysisResult` interface in the analysis detail page --
 * every field is a real column on the `Analysis` Prisma model. */
export interface AnalysisResult {
  id: string;
  videoId: string;
  status: string;
  shotType: string | null;
  shotConfidence: number | null;
  gradeOverall: number | null;
  gradeLetter: string | null;
  scoreBacklift: number | null;
  scoreWeightTransfer: number | null;
  scoreHeadPosition: number | null;
  scoreFollowThrough: number | null;
  scoreTiming: number | null;
  scoreBalance: number | null;
  scoreFootwork: number | null;
  scoreShotSelection: number | null;
  bowlingArm?: string | null;
  bowlingType?: string | null;
  deliveryType?: string | null;
  deliveryConfidence?: number | null;
  scoreRunUpRhythm?: number | null;
  scoreLoadUp?: number | null;
  scoreBowlingArmAction?: number | null;
  scoreDeliveryStride?: number | null;
  scoreReleasePoint?: number | null;
  scoreAlignment?: number | null;
  coachingTips: unknown;
  technicalFeedback?: TechnicalFeedbackItem[] | null;
  activityType?: string | null;
  activityConfidence?: number | null;
  rejectionReason?: string | null;
  rawGeminiResponse?: RawGeminiResponse | null;
  video?: AnalysisVideo;
}

export async function getAnalysisForVideo(videoId: string): Promise<AnalysisResult> {
  return apiFetch<AnalysisResult>(`/api/analysis/video/${videoId}`);
}

export interface AnalysisFrame {
  index: number;
  timestampMs: number;
  url: string;
}

export async function getAnalysisFrames(analysisId: string): Promise<AnalysisFrame[]> {
  const data = await apiFetch<{ frames: AnalysisFrame[] }>(`/api/analysis/${analysisId}/frames`);
  return data.frames;
}

/** Mirrors web's `PoseEstimateResponse` in src/lib/analysis/mediapipe-types.ts. */
export interface PoseKeypoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}
export interface FrameLandmarks {
  frameIndex: number;
  timestamp: number;
  keypoints: Record<string, PoseKeypoint>;
  poseConfidence: number;
}
export interface PoseEstimateResponse {
  landmarks: FrameLandmarks[];
  processingMs: number;
  /** Legacy clip-level pixel bbox (last-MediaPipe-batch-wins, can drift on
   * early/late frames) -- prefer the real per-frame box computed from
   * landmarks (see lib/poseOverlay.ts's bboxFromFrameLandmarks), same as
   * web. Added in Phase 8 for the tracked-subject bbox layer toggle. */
  batsman_bbox?: Record<string, unknown> | null;
}

export async function getAnalysisPose(analysisId: string): Promise<PoseEstimateResponse> {
  return apiFetch<PoseEstimateResponse>(`/api/analysis/${analysisId}/pose`);
}

export interface Annotation {
  id: string;
  analysisId?: string;
  authorId: string;
  timestampMs: number;
  content: string;
  isPrivate: boolean;
  createdAt: string;
}

export async function getAnnotations(analysisId: string): Promise<Annotation[]> {
  const data = await apiFetch<{ annotations: Annotation[] }>(`/api/analysis/${analysisId}/annotations`);
  return data.annotations;
}

export interface CreateAnnotationInput {
  timestampMs: number;
  content: string;
  isPrivate?: boolean;
}

/** Coach-only on the backend (POST returns 403 for non-coach roles). */
export async function createAnnotation(
  analysisId: string,
  input: CreateAnnotationInput
): Promise<Annotation> {
  return apiFetch<Annotation>(`/api/analysis/${analysisId}/annotations`, {
    method: "POST",
    body: input,
  });
}
