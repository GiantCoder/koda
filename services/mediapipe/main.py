from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import mediapipe as mp
import cv2
import numpy as np
import base64
import time

app = FastAPI(title="Koda Cricket MediaPipe Service", version="1.0.0")

mp_pose = mp.solutions.pose


class VideoMetadata(BaseModel):
    width: int
    height: int
    fps: float
    cameraDistance: Optional[str] = "17-22m"
    cameraAngle: Optional[str] = "behind_stumps"


class PoseRequest(BaseModel):
    frames: List[str]
    frameCount: int
    videoMetadata: VideoMetadata


class FrameLandmarks(BaseModel):
    frameIndex: int
    timestamp: float
    keypoints: dict
    poseConfidence: float


class PoseResponse(BaseModel):
    landmarks: List[FrameLandmarks]
    batsman_bbox: Optional[dict]
    processingMs: int


POSE_LANDMARK_NAMES = [
    "nose", "leftEyeInner", "leftEye", "leftEyeOuter",
    "rightEyeInner", "rightEye", "rightEyeOuter",
    "leftEar", "rightEar", "mouthLeft", "mouthRight",
    "leftShoulder", "rightShoulder", "leftElbow", "rightElbow",
    "leftWrist", "rightWrist", "leftPinky", "rightPinky",
    "leftIndex", "rightIndex", "leftThumb", "rightThumb",
    "leftHip", "rightHip", "leftKnee", "rightKnee",
    "leftAnkle", "rightAnkle", "leftHeel", "rightHeel",
    "leftFootIndex", "rightFootIndex"
]


def decode_frame(b64_string: str) -> np.ndarray:
    img_data = base64.b64decode(b64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def roi_bbox_for_frame(frame: np.ndarray) -> dict:
    """
    Landscape: narrow central strip (behind-stumps heuristic).
    Portrait / phone selfie: full frame — a width-only crop cuts the batter off (e.g. 478×850).
    """
    h, w = frame.shape[:2]
    if h > w:
        return {"x": 0, "y": 0, "w": w, "h": h}
    cw = int(w * 0.42)
    cx = max(0, (w - cw) // 2)
    ch = int(h * 0.92)
    cy = max(0, int(h * 0.04))
    return {"x": cx, "y": cy, "w": min(cw, w - cx), "h": min(ch, h - cy)}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "mediapipe"}


@app.post("/pose", response_model=PoseResponse)
async def estimate_pose(request: PoseRequest):
    start_time = time.time()
    results_list = []
    batsman_bbox = None

    # Keyframes from FFmpeg are weakly temporal; static mode detects each frame independently.
    det_conf = float(os.environ.get("MIN_DETECTION_CONFIDENCE", "0.35"))
    track_conf = float(os.environ.get("MIN_TRACKING_CONFIDENCE", "0.35"))
    min_avg_vis = float(os.environ.get("MIN_POSE_AVG_VISIBILITY", "0.32"))

    with mp_pose.Pose(
        static_image_mode=True,
        model_complexity=1,
        enable_segmentation=False,
        min_detection_confidence=min(0.9, max(0.2, det_conf)),
        min_tracking_confidence=min(0.9, max(0.2, track_conf)),
    ) as pose:
        for idx, b64_frame in enumerate(request.frames):
            try:
                frame = decode_frame(b64_frame)

                if idx == 0 or batsman_bbox is None:
                    batsman_bbox = roi_bbox_for_frame(frame)

                if batsman_bbox:
                    x, y, bw, bh = (
                        batsman_bbox["x"],
                        batsman_bbox["y"],
                        batsman_bbox["w"],
                        batsman_bbox["h"],
                    )
                    cropped = frame[y : y + bh, x : x + bw]
                    if cropped.size == 0:
                        cropped = frame
                else:
                    cropped = frame

                rgb_frame = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
                result = pose.process(rgb_frame)

                if result.pose_landmarks:
                    keypoints = {}
                    visibility_sum = 0
                    for i, landmark in enumerate(result.pose_landmarks.landmark):
                        name = POSE_LANDMARK_NAMES[i] if i < len(POSE_LANDMARK_NAMES) else f"point_{i}"
                        keypoints[name] = {
                            "x": round(landmark.x, 4),
                            "y": round(landmark.y, 4),
                            "z": round(landmark.z, 4),
                            "visibility": round(landmark.visibility, 4),
                        }
                        visibility_sum += landmark.visibility

                    avg_confidence = visibility_sum / len(result.pose_landmarks.landmark)
                    # Torso + arms matter most for batting; mean over all 33 points is harsh for phone video
                    core_idx = {11, 12, 23, 24, 0}  # shoulders, hips, nose
                    core_vis = [
                        result.pose_landmarks.landmark[i].visibility for i in core_idx
                    ]
                    core_avg = sum(core_vis) / len(core_vis)
                    gate = max(avg_confidence, core_avg * 0.95)
                    if gate >= min_avg_vis:
                        results_list.append(
                            FrameLandmarks(
                                frameIndex=idx,
                                timestamp=round(idx / max(request.videoMetadata.fps, 0.01), 3),
                                keypoints=keypoints,
                                poseConfidence=round(float(gate), 3),
                            )
                        )
            except Exception:
                continue

    processing_ms = int((time.time() - start_time) * 1000)
    if not results_list:
        raise HTTPException(status_code=422, detail="No valid pose data extracted from frames")

    return PoseResponse(
        landmarks=results_list,
        batsman_bbox=batsman_bbox,
        processingMs=processing_ms
    )
