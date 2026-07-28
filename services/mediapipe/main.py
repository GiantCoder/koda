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

# Torso + arms — used for visibility gating (phone video often has low foot visibility)
CORE_LANDMARK_IDX = {0, 11, 12, 13, 14, 15, 16, 23, 24}


def decode_frame(b64_string: str) -> np.ndarray:
    img_data = base64.b64decode(b64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def bbox_from_landmarks(
    landmarks, frame_w: int, frame_h: int, padding_ratio: float = 0.12
) -> dict:
    """Pixel bbox in full frame from visible pose points (for UI overlay)."""
    xs: List[float] = []
    ys: List[float] = []
    for lm in landmarks.landmark:
        if lm.visibility >= 0.2:
            xs.append(lm.x * frame_w)
            ys.append(lm.y * frame_h)
    if not xs:
        return {"x": 0, "y": 0, "w": frame_w, "h": frame_h}
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    pad_x = max(8, (max_x - min_x) * padding_ratio)
    pad_y = max(8, (max_y - min_y) * padding_ratio)
    x = max(0, int(min_x - pad_x))
    y = max(0, int(min_y - pad_y))
    w = min(frame_w - x, int(max_x - min_x + 2 * pad_x))
    h = min(frame_h - y, int(max_y - min_y + 2 * pad_y))
    return {"x": x, "y": y, "w": max(1, w), "h": max(1, h)}


def merge_bboxes(a: dict, b: dict) -> dict:
    ax2, ay2 = a["x"] + a["w"], a["y"] + a["h"]
    bx2, by2 = b["x"] + b["w"], b["y"] + b["h"]
    x = min(a["x"], b["x"])
    y = min(a["y"], b["y"])
    return {
        "x": x,
        "y": y,
        "w": max(ax2, bx2) - x,
        "h": max(ay2, by2) - y,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "mediapipe"}


@app.post("/pose", response_model=PoseResponse)
async def estimate_pose(request: PoseRequest):
    start_time = time.time()
    results_list = []
    batsman_bbox = None

    # Keyframes from FFmpeg are weakly temporal; static mode detects each frame independently.
    det_conf = float(os.environ.get("MIN_DETECTION_CONFIDENCE", "0.3"))
    track_conf = float(os.environ.get("MIN_TRACKING_CONFIDENCE", "0.3"))
    min_core_vis = float(os.environ.get("MIN_POSE_AVG_VISIBILITY", "0.25"))

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
                if frame is None or frame.size == 0:
                    continue

                fh, fw = frame.shape[:2]
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = pose.process(rgb_frame)

                if not result.pose_landmarks:
                    continue

                keypoints = {}
                visibility_sum = 0
                core_vis_sum = 0
                core_count = 0
                for i, landmark in enumerate(result.pose_landmarks.landmark):
                    name = POSE_LANDMARK_NAMES[i] if i < len(POSE_LANDMARK_NAMES) else f"point_{i}"
                    keypoints[name] = {
                        "x": round(landmark.x, 4),
                        "y": round(landmark.y, 4),
                        "z": round(landmark.z, 4),
                        "visibility": round(landmark.visibility, 4),
                    }
                    visibility_sum += landmark.visibility
                    if i in CORE_LANDMARK_IDX:
                        core_vis_sum += landmark.visibility
                        core_count += 1

                avg_confidence = visibility_sum / len(result.pose_landmarks.landmark)
                core_avg = core_vis_sum / max(core_count, 1)
                gate = max(core_avg, avg_confidence * 0.85)
                if gate < min_core_vis:
                    continue

                frame_bbox = bbox_from_landmarks(result.pose_landmarks, fw, fh)
                if batsman_bbox is None:
                    batsman_bbox = frame_bbox
                else:
                    batsman_bbox = merge_bboxes(batsman_bbox, frame_bbox)

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
    # Empty result is valid for cropped far-end ROIs that miss the subject —
    # callers retry with alternate crops rather than treating this as a hard error.
    return PoseResponse(
        landmarks=results_list,
        batsman_bbox=batsman_bbox,
        processingMs=processing_ms
    )
