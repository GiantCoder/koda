/** Matches `services/mediapipe/main.py` PoseResponse (subset used in TS). */

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
  batsman_bbox?: Record<string, unknown> | null;
  processingMs: number;
}
